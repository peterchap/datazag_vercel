import { pool } from '@/lib/drizzle';

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT NOW() as now');
    console.log('DB connection OK. NOW() =', rows[0].now);
    const userCount = await client.query('SELECT count(*)::int AS c FROM users');
    console.log('User count:', userCount.rows[0].c);
  } finally {
    client.release();
    process.exit(0);
  }
}

main().catch(e => { console.error('DB check failed', e); process.exit(1); });
