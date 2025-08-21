import 'dotenv/config';
import { db, pool } from '@/lib/drizzle';
import { users, apiKeys, transactions, apiUsage } from '@/shared/schema';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { faker } = require('@faker-js/faker') as { faker: any };
import { eq } from 'drizzle-orm';

async function ensureUser(email: string, overrides: Partial<typeof users.$inferInsert> = {}) {
  const [existing]: any = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return existing;
  const [created]: any = await db.insert(users).values({
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    password: '$2a$10$C0qO0rQ8rj6JQ0aV4c2OKu7Gk5x5a4Q/7KQx4hC1i8pM2s9M5eZtG', // "Password123" (bcrypt)
    email,
    company: 'Acme Inc',
    credits: 500,
    role: 'business_admin',
    active: true,
    lastLogin: new Date(),
    ...overrides,
  }).returning();
  return created;
}

async function seed() {
  // Create or fetch a main test admin user
  const admin = await ensureUser('admin+seed@example.com');

  // Create 2-3 API keys
  const keyRows: any[] = [];
  for (let i = 0; i < 3; i++) {
    const [row]: any = await db.insert(apiKeys).values({
      userId: admin.id,
      name: `Key ${i + 1}`,
      key: faker.string.alphanumeric({ length: 32 }),
      isActive: i !== 2,
    }).returning();
    keyRows.push(row);
  }

  // Create transactions (mix of purchases/usages)
  for (let i = 0; i < 40; i++) {
    const isPurchase = i % 3 === 0;
    await db.insert(transactions).values({
      userId: admin.id,
      type: isPurchase ? 'purchase' : 'usage',
      amount: isPurchase ? 100 : -Math.floor(Math.random() * 10 + 1),
      description: isPurchase ? 'Credit purchase' : 'API credit usage',
      status: 'success',
      apiKeyId: keyRows[0]?.id,
      createdAt: faker.date.recent({ days: 60 }),
    });
  }

  // Create API usage rows
  for (let i = 0; i < 120; i++) {
    await db.insert(apiUsage).values({
      userId: admin.id,
      apiKeyId: keyRows[1]?.id ?? keyRows[0]?.id,
      endpoint: faker.helpers.arrayElement(['/api/search', '/api/company', '/api/person']),
      queryType: faker.helpers.arrayElement(['name', 'company', 'email', 'domain']),
      creditsUsed: Math.floor(Math.random() * 3 + 1),
      status: faker.helpers.arrayElement(['success', 'failed']),
      responseTime: Math.floor(Math.random() * 500 + 50),
      createdAt: faker.date.recent({ days: 60 }),
    });
  }

  console.log('Seeded test data for user:', admin.email, 'id=', admin.id);
}

seed().then(() => pool.end()).catch((e) => { console.error(e); pool.end(); process.exit(1); });
