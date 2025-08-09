import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { Pool } from "pg";

export const runtime = "nodejs";

// Reuse a single pool across invocations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 10_000,
});

function verifySignature(raw: string, secret: string, provided: string | null) {
  if (!provided) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.USAGE_WEBHOOK_SECRET;
  const dbUrl = process.env.DATABASE_URL;

  if (!secret || !dbUrl) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const signature = req.headers.get("x-signature");
  const idempotencyKey = req.headers.get("x-idempotency-key") ?? "";

  // Read raw body for HMAC
  const rawBody = await req.text();

  if (!verifySignature(rawBody, secret, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Expected: { apiKey, delta, endpoint?, ts?, requestId?, meta? }
  if (!payload?.apiKey || typeof payload?.delta !== "number" || !idempotencyKey) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Record event (idempotent)
    const insertRes = await client.query(
      `INSERT INTO usage_events (idempotency_key, api_key, delta, endpoint, ts, request_id, meta)
       VALUES ($1,$2,$3,$4,TO_TIMESTAMP($5/1000.0),$6,$7)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        idempotencyKey,
        payload.apiKey,
        payload.delta,
        payload.endpoint ?? null,
        payload.ts ?? Date.now(),
        payload.requestId ?? null,
        payload.meta ? JSON.stringify(payload.meta) : null,
      ]
    );

    if (insertRes.rowCount === 1) {
      // Only apply delta if this is the first time we see this idempotency key
      await client.query(
        `INSERT INTO usage_counters (api_key, credits_used)
         VALUES ($1, GREATEST($2,0))
         ON CONFLICT (api_key)
         DO UPDATE SET credits_used = usage_counters.credits_used + EXCLUDED.credits_used`,
        [payload.apiKey, Math.max(payload.delta, 0)]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Usage ingest error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}