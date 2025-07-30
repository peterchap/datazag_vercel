// Create test users for API integration testing
require('dotenv').config();
const { Pool } = require('pg');

class TestUserCreator {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    console.log('🔧 Test User Creator Initialized');
    console.log('📍 Database URL:', process.env.DATABASE_URL ? 'Connected' : 'Missing');
  }

  async createTestUsers() {
    const client = await this.pool.connect();
    
    try {
      console.log('\n🚀 Creating test users...\n');

      // Test users to create
      const testUsers = [
        {
          email: 'john@doe.com',
          name: 'John Doe',
          role: 'BUSINESS_ADMIN',
          credits: 1000
        },
        {
          email: 'jane@test.com',
          name: 'Jane Test',
          role: 'CLIENT_ADMIN', 
          credits: 500
        },
        {
          email: 'api@tester.com',
          name: 'API Tester',
          role: 'USER',
          credits: 250
        }
      ];

      for (const user of testUsers) {
        try {
          // Check if user already exists
          const existingUser = await client.query(
            'SELECT id, email FROM users WHERE email = $1',
            [user.email]
          );

          if (existingUser.rows.length > 0) {
            console.log(`⚠️  User ${user.email} already exists, updating credits...`);
            
            // Update existing user credits
            await client.query(
              'UPDATE users SET credits = $1, active = true WHERE email = $2',
              [user.credits, user.email]
            );
            
            console.log(`✅ Updated ${user.email} with ${user.credits} credits`);
          } else {
            // Create new user
            const result = await client.query(`
              INSERT INTO users (
                email, name, role, credits, active, 
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, true, NOW(), NOW())
              RETURNING id, email, name, role, credits
            `, [
              user.email,
              user.name, 
              user.role,
              user.credits
            ]);

            const newUser = result.rows[0];
            console.log(`✅ Created user:`, {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              role: newUser.role,
              credits: newUser.credits
            });
          }

          // Small delay between users
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (userError) {
          console.error(`❌ Error creating user ${user.email}:`, userError.message);
        }
      }

      // Show summary of all test users
      console.log('\n📊 Test Users Summary:');
      const allTestUsers = await client.query(`
        SELECT id, email, name, role, credits, active
        FROM users 
        WHERE email IN ('john@doe.com', 'jane@test.com', 'api@tester.com')
        ORDER BY credits DESC
      `);

      allTestUsers.rows.forEach(user => {
        console.log(`   ${user.email} - ${user.role} - ${user.credits} credits - ${user.active ? 'Active' : 'Inactive'}`);
      });

      console.log('\n🎉 Test users setup complete!');
      
      return allTestUsers.rows;

    } catch (error) {
      console.error('❌ Error creating test users:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async cleanup() {
    await this.pool.end();
    console.log('🧹 Database connection closed');
  }
}

// Run the test user creation
async function createUsers() {
  const creator = new TestUserCreator();
  
  try {
    await creator.createTestUsers();
  } catch (error) {
    console.error('Test user creation failed:', error.message);
  } finally {
    await creator.cleanup();
  }
}

// Execute if run directly
if (require.main === module) {
  createUsers();
}

module.exports = { TestUserCreator };
