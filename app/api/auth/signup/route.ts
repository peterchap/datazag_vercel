import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').toLowerCase().trim();
    const password = String(body?.password || '');
    const firstName = String(body?.firstName || '').trim() || null;
    const lastName = String(body?.lastName || '').trim() || null;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const exists = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
      if (exists.rowCount) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
      const password_hash = await hashPassword(password);
      const inserted = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, credits)
         VALUES ($1, $2, $3, $4, 'USER', 1000)
         RETURNING id, email, first_name, last_name, role, credits`,
        [email, password_hash, firstName, lastName]
      );
      return NextResponse.json({ user: inserted.rows[0] }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error', details: e?.message }, { status: 500 });
  }
}