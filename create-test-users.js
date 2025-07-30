// Test user creation and verification script
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function createTestUsers() {
  console.log('🚀 Creating test users for role validation...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // First, create test companies
    console.log('1. Creating test companies...');
    
    const company1 = await client.query(`
      INSERT INTO companies (name, domain) 
      VALUES ('DataZag Inc', 'datazag.com') 
      ON CONFLICT DO NOTHING 
      RETURNING id, name
    `);
    
    const company2 = await client.query(`
      INSERT INTO companies (name, domain) 
      VALUES ('Acme Corp', 'acme.com') 
      ON CONFLICT DO NOTHING 
      RETURNING id, name
    `);
    
    const company3 = await client.query(`
      INSERT INTO companies (name, domain) 
      VALUES ('TechStart LLC', 'techstart.com') 
      ON CONFLICT DO NOTHING 
      RETURNING id, name
    `);

    // Get company IDs (handle case where companies already exist)
    let datazagId, acmeId, techstartId;
    
    if (company1.rows.length > 0) {
      datazagId = company1.rows[0].id;
    } else {
      const existing1 = await client.query("SELECT id FROM companies WHERE name = 'DataZag Inc'");
      datazagId = existing1.rows[0].id;
    }
    
    if (company2.rows.length > 0) {
      acmeId = company2.rows[0].id;
    } else {
      const existing2 = await client.query("SELECT id FROM companies WHERE name = 'Acme Corp'");
      acmeId = existing2.rows[0].id;
    }
    
    if (company3.rows.length > 0) {
      techstartId = company3.rows[0].id;
    } else {
      const existing3 = await client.query("SELECT id FROM companies WHERE name = 'TechStart LLC'");
      techstartId = existing3.rows[0].id;
    }

    console.log(`✅ DataZag Inc (ID: ${datazagId})`);
    console.log(`✅ Acme Corp (ID: ${acmeId})`);
    console.log(`✅ TechStart LLC (ID: ${techstartId})\n`);

    // Create test users
    console.log('2. Creating test users...');
    
    const testUsers = [
      {
        email: 'admin@datazag.com',
        name: 'DataZag Admin',
        role: 'BUSINESS_ADMIN',
        company_id: datazagId,
        can_purchase_credits: true,
        description: 'Platform administrator - full access to all features'
      },
      {
        email: 'admin@acme.com',
        name: 'John Smith',
        role: 'CLIENT_ADMIN',
        company_id: acmeId,
        can_purchase_credits: true,
        description: 'Company admin - can manage company users and purchase credits'
      },
      {
        email: 'admin@techstart.com',
        name: 'Sarah Johnson',
        role: 'CLIENT_ADMIN',
        company_id: techstartId,
        can_purchase_credits: true,
        description: 'Company admin - can manage company users and purchase credits'
      },
      {
        email: 'user@acme.com',
        name: 'Mike Wilson',
        role: 'USER',
        company_id: acmeId,
        can_purchase_credits: false,
        description: 'Regular user - can consume APIs but cannot purchase credits'
      },
      {
        email: 'developer@techstart.com',
        name: 'Emma Davis',
        role: 'USER',
        company_id: techstartId,
        can_purchase_credits: false,
        description: 'Regular user - can consume APIs but cannot purchase credits'
      },
      {
        email: 'api-user@acme.com',
        name: 'Bob Chen',
        role: 'USER',
        company_id: acmeId,
        can_purchase_credits: false,
        description: 'API consumer - limited access to company resources'
      }
    ];

    for (const user of testUsers) {
      try {
        const result = await client.query(`
          INSERT INTO users (email, name, role, company_id, can_purchase_credits) 
          VALUES ($1, $2, $3, $4, $5) 
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            company_id = EXCLUDED.company_id,
            can_purchase_credits = EXCLUDED.can_purchase_credits,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, email, role
        `, [user.email, user.name, user.role, user.company_id, user.can_purchase_credits]);
        
        console.log(`✅ ${user.role}: ${user.name} (${user.email}) - ${user.description}`);
        
        // Create API keys for each user
        const apiKey = `test_${user.role.toLowerCase()}_${Math.random().toString(36).substring(2, 15)}`;
        await client.query(`
          INSERT INTO api_keys (user_id, key_name, api_key) 
          VALUES ($1, $2, $3)
          ON CONFLICT (api_key) DO NOTHING
        `, [result.rows[0].id, `${user.name} Test Key`, apiKey]);
        
      } catch (error) {
        console.log(`⚠️  User ${user.email} - ${error.message}`);
      }
    }

    console.log('\n3. Verifying user creation and role assignments...');
    
    // Verify users by role
    const businessAdmins = await client.query(`
      SELECT u.id, u.name, u.email, u.role, c.name as company_name, u.can_purchase_credits
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE u.role = 'BUSINESS_ADMIN'
    `);
    
    const clientAdmins = await client.query(`
      SELECT u.id, u.name, u.email, u.role, c.name as company_name, u.can_purchase_credits
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE u.role = 'CLIENT_ADMIN'
    `);
    
    const regularUsers = await client.query(`
      SELECT u.id, u.name, u.email, u.role, c.name as company_name, u.can_purchase_credits
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE u.role = 'USER'
    `);

    console.log('\n📊 User Role Summary:');
    console.log(`\n🔧 BUSINESS_ADMIN Users (${businessAdmins.rows.length}):`);
    businessAdmins.rows.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) @ ${user.company_name} | Credits: ${user.can_purchase_credits ? '✅' : '❌'}`);
    });

    console.log(`\n👔 CLIENT_ADMIN Users (${clientAdmins.rows.length}):`);
    clientAdmins.rows.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) @ ${user.company_name} | Credits: ${user.can_purchase_credits ? '✅' : '❌'}`);
    });

    console.log(`\n👤 USER Role Users (${regularUsers.rows.length}):`);
    regularUsers.rows.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) @ ${user.company_name} | Credits: ${user.can_purchase_credits ? '✅' : '❌'}`);
    });

    // Test role-based queries
    console.log('\n4. Testing role-based access patterns...');
    
    // Test: Can CLIENT_ADMIN see users in their company?
    const acmeUsers = await client.query(`
      SELECT u.name, u.email, u.role 
      FROM users u 
      WHERE u.company_id = $1 
      ORDER BY u.role, u.name
    `, [acmeId]);
    
    console.log(`\n🏢 Acme Corp Users (CLIENT_ADMIN should see these):`);
    acmeUsers.rows.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
    });

    // Test: API key generation
    const apiKeys = await client.query(`
      SELECT ak.api_key, ak.key_name, u.name, u.role, c.name as company_name
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE ak.is_active = true
      ORDER BY u.role, u.name
    `);
    
    console.log(`\n🔑 API Keys Generated (${apiKeys.rows.length}):`);
    apiKeys.rows.forEach(key => {
      console.log(`   - ${key.name} (${key.role}) @ ${key.company_name}: ${key.api_key.substring(0, 20)}...`);
    });

    // Test permissions summary
    console.log('\n5. Permission Verification:');
    
    const permissionTest = await client.query(`
      SELECT 
        role,
        COUNT(*) as user_count,
        COUNT(CASE WHEN can_purchase_credits = true THEN 1 END) as can_purchase_count
      FROM users 
      GROUP BY role 
      ORDER BY role
    `);
    
    permissionTest.rows.forEach(perm => {
      console.log(`   ${perm.role}: ${perm.user_count} users, ${perm.can_purchase_count} can purchase credits`);
    });

    client.release();
    await pool.end();
    
    console.log('\n🎉 Test user creation and verification completed!');
    console.log('\n📋 Test Scenarios to Try:');
    console.log('1. Login as admin@datazag.com (BUSINESS_ADMIN) - Should see all companies/users');
    console.log('2. Login as admin@acme.com (CLIENT_ADMIN) - Should see only Acme Corp users');
    console.log('3. Login as user@acme.com (USER) - Should have limited access, no credit purchasing');
    console.log('4. Test API key functionality for each user type');
    console.log('5. Verify role-based page access restrictions');
    
    console.log('\n🔗 Ready to test at: http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Test user creation failed:', error.message);
    process.exit(1);
  }
}

createTestUsers();
