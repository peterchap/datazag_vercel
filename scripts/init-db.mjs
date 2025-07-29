#!/usr/bin/env node

/**
 * Database initialization script for production deployment
 * Run this after deploying to Vercel to set up your database schema
 */

import { db } from './server/db.js';
import { users, apiKeys, adminRequests, transactions, userSubscriptions } from './shared/schema.js';
import { hash } from 'bcrypt';

async function initializeDatabase() {
  console.log('🚀 Initializing database...');
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const result = await db.execute('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Check if tables exist and have data
    console.log('🔍 Checking existing data...');
    const existingUsers = await db.select().from(users).limit(1);
    
    if (existingUsers.length > 0) {
      console.log('📊 Database already contains data. Skipping initialization.');
      console.log(`Found ${existingUsers.length} existing users.`);
      return;
    }
    
    // Create default admin user
    console.log('👤 Creating default admin user...');
    const hashedPassword = await hash('admin123', 10);
    
    await db.insert(users).values({
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      credits: 1000,
      company: 'System Administration',
      isEmailVerified: true
    });
    
    console.log('✅ Default admin user created');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');
    
    console.log('🎉 Database initialization complete!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}
