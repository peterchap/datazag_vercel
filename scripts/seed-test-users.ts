import { pool } from '@/lib/drizzle';
import bcrypt from 'bcryptjs';

async function run() {
  const client = await pool.connect();
  try {
    console.log('Seeding test users...');
    const users = [
      { first: 'Biz', last: 'Admin', email: 'biz.admin@test.local', role: 'business_admin' },
      { first: 'Client', last: 'Admin', email: 'client.admin@test.local', role: 'client_admin' },
      { first: 'Regular', last: 'User', email: 'user@test.local', role: 'user' },
    ];
    for (const u of users) {
      const hashed = await bcrypt.hash('Passw0rd!', 10);
      const { rowCount } = await client.query('SELECT 1 FROM users WHERE email=$1', [u.email]);
      if (rowCount === 0) {
        await client.query(
          `INSERT INTO users (first_name,last_name,email,company,password,credits,role,active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
          [u.first, u.last, u.email, 'Test Co', hashed, 100, u.role]
        );
        console.log('Inserted', u.email);
      } else {
        console.log('Exists -> skipping', u.email);
      }
    }
    console.log('Done.');
  } finally {
    client.release();
    process.exit(0);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
