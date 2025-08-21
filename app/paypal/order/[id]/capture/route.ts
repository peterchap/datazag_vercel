import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool, db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';

// Finalize PayPal order by marking the pending transaction successful and crediting user
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (process.env.PAYPAL_ENABLED !== 'true') {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  }
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id ? parseInt(String((session!.user as any).id), 10) : undefined;
  if (!uid) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const orderId = params.id;
  const client = await pool.connect();
  try {
    // Find pending transaction for this order and user
    const { rows } = await client.query(
      `SELECT id, metadata, amount
       FROM transactions
       WHERE user_id = $1 AND status = 'pending' AND metadata->>'orderId' = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [uid, orderId]
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ success: false, message: 'No pending order found' }, { status: 404 });

    // Mark as success
    try {
      await client.query(
        `UPDATE transactions SET status = 'success', metadata = coalesce(metadata, '{}'::jsonb) || '{"captured": true}'::jsonb WHERE id = $1`,
        [row.id]
      );
    } catch (_e) {
      // Fallback for schemas without status column
      await client.query(
        `UPDATE transactions SET metadata = coalesce(metadata, '{}'::jsonb) || '{"captured": true}'::jsonb WHERE id = $1`,
        [row.id]
      );
    }

    // Determine credits to add (row.amount holds credits count as stored)
    const creditsToAdd = Number(row.amount) || 0;
    const [u] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    if (!u) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    const newTotal = (u.credits ?? 0) + creditsToAdd;
    await db.update(users).set({ credits: newTotal }).where(eq(users.id, uid));

    return NextResponse.json({ success: true, added: creditsToAdd, newTotal });
  } finally {
    client.release();
  }
}
