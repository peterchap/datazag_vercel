import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/drizzle';
import { z } from 'zod';
import { checkRateLimit, extractClientIP } from '@/lib/rate-limit';

const registerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
  company: z.string().min(1).max(255),
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = extractClientIP(req.headers);
    const rate = checkRateLimit(`register:${ip}`);
    if (rate.limited) {
      return NextResponse.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((rate.reset - Date.now())/1000)) } });
    }

    const json = await req.json();
    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }
    const { firstName, lastName, email, password, company } = parsed.data;

    const client = await pool.connect();
    try {
      const lower = email.toLowerCase();
  const existing = await client.query('SELECT id FROM users WHERE email = $1', [lower]);
  if ((existing.rowCount ?? 0) > 0) {
        return NextResponse.json({ error: 'User already exists' }, { status: 409 });
      }
      const hashed = await bcrypt.hash(password, 10);
      const insert = await client.query(
        `INSERT INTO users (first_name, last_name, email, company, password, credits, role, active) 
         VALUES ($1,$2,$3,$4,$5,0,'user',true) RETURNING id, email, first_name, last_name, company, role, credits`,
        [firstName, lastName, lower, company, hashed]
      );
      const user = insert.rows[0];
      return NextResponse.json({
        id: String(user.id),
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        role: user.role,
        credits: user.credits,
      }, { status: 201, headers: { 'Access-Control-Allow-Origin': '*' } });
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error('Register error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}
