import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword } from '@/lib/password';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').toLowerCase().trim();
    const password = String(body?.password || '');
    const firstName = String(body?.firstName || '').trim() || null;
    const lastName = String(body?.lastName || '').trim() || null;
    const company = (body?.company ? String(body.company).trim() : '') || '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not configured', details: 'DATABASE_URL is missing' }, { status: 500 });
    }

    const client = await pool.connect();
    try {
      const exists = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
      if (exists.rowCount) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }

      // Detect available columns to support different schemas
      const colsRes = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users'`
      );
      const cols = new Set<string>(colsRes.rows.map((r: any) => r.column_name));
      const has = (c: string) => cols.has(c);

      const passwordHashed = await hashPassword(password);

      const columns: string[] = ['email'];
      const values: any[] = [email];
      const placeholders: string[] = ['$1'];
      let p = 1;

      if (has('password_hash')) { p++; columns.push('password_hash'); values.push(passwordHashed); placeholders.push(`$${p}`); }
      else if (has('password')) { p++; columns.push('password'); values.push(passwordHashed); placeholders.push(`$${p}`); }

      if (has('first_name')) { p++; columns.push('first_name'); values.push(firstName); placeholders.push(`$${p}`); }
      if (has('last_name')) { p++; columns.push('last_name'); values.push(lastName); placeholders.push(`$${p}`); }
      if (has('company')) { p++; columns.push('company'); values.push(company); placeholders.push(`$${p}`); }
      if (has('role')) { p++; columns.push('role'); values.push('user'); placeholders.push(`$${p}`); }
      if (has('credits')) { p++; columns.push('credits'); values.push(0); placeholders.push(`$${p}`); }
      if (has('active')) { p++; columns.push('active'); values.push(true); placeholders.push(`$${p}`); }

      // Ensure at least email and password were included
      if (!columns.find(c => c === 'password_hash' || c === 'password')) {
        return NextResponse.json({ error: 'User schema missing password column' }, { status: 500 });
      }

      // Perform insert, return only id to avoid RETURNING unknown columns
      const insertSql = `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
      const inserted = await client.query(insertSql, values);
      const newId = inserted.rows[0]?.id;

      // Build a safe SELECT with only existing columns
      const selectCols = ['id']
        .concat(has('email') ? ['email'] : [])
        .concat(has('first_name') ? ['first_name'] : [])
        .concat(has('last_name') ? ['last_name'] : [])
        .concat(has('company') ? ['company'] : [])
        .concat(has('role') ? ['role'] : [])
        .concat(has('credits') ? ['credits'] : []);
      const selectSql = `SELECT ${selectCols.join(', ')} FROM users WHERE id = $1`;
      const userRes = await client.query(selectSql, [newId]);
      const row = userRes.rows[0] || { id: newId, email };

      // Normalize shape
      const normalized = {
        id: String(row.id),
        email: row.email ?? email,
        firstName: row.first_name ?? firstName ?? '',
        lastName: row.last_name ?? lastName ?? '',
        company: row.company ?? '',
        role: (row.role ?? 'user'),
        credits: row.credits ?? 0,
      };

      return NextResponse.json({ user: normalized }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error('Signup error:', e);
    return NextResponse.json({ error: 'Internal server error', details: e?.message }, { status: 500 });
  }
}