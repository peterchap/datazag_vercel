// This script creates admin users with the updated registration structure
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { storage } from './server/storage.ts';

const createAdminUsers = async () => {
  try {
    console.log('Starting admin user creation script');
    
    const saltRounds = 10;
    
    // Create Business Admin
    const businessAdminPassword = 'BusinessAdmin123!';
    const businessAdminHash = await bcrypt.hash(businessAdminPassword, saltRounds);
    
    const businessAdmin = {
      username: 'business_admin',
      firstName: 'Business',
      lastName: 'Administrator',
      email: 'business.admin@yourcompany.com',
      password: businessAdminHash,
      company: 'Your Business Name',
      role: 'business_admin',
      credits: 10000,
      emailVerified: true, // Admin accounts are pre-verified
      canPurchaseCredits: true
    };
    
    // Create Client Admin
    const clientAdminPassword = 'ClientAdmin123!';
    const clientAdminHash = await bcrypt.hash(clientAdminPassword, saltRounds);
    
    const clientAdmin = {
      username: 'client_admin',
      firstName: 'Client',
      lastName: 'Administrator',
      email: 'client.admin@clientcompany.com',
      password: clientAdminHash,
      company: 'Client Company Ltd',
      role: 'client_admin',
      credits: 5000,
      emailVerified: true, // Admin accounts are pre-verified
      canPurchaseCredits: true
    };
    
    // Create Business Admin
    console.log('Creating Business Admin...');
    try {
      const newBusinessAdmin = await storage.createUser(businessAdmin);
      console.log('SUCCESS: Business Admin created:', {
        id: newBusinessAdmin.id,
        username: newBusinessAdmin.username,
        email: newBusinessAdmin.email,
        company: newBusinessAdmin.company,
        role: newBusinessAdmin.role,
        credits: newBusinessAdmin.credits
      });
      console.log('Business Admin login credentials:');
      console.log('Email:', businessAdmin.email);
      console.log('Password:', businessAdminPassword);
      console.log('---');
    } catch (err) {
      console.error('ERROR creating Business Admin:', err.message);
    }
    
    // Create Client Admin
    console.log('Creating Client Admin...');
    try {
      const newClientAdmin = await storage.createUser(clientAdmin);
      console.log('SUCCESS: Client Admin created:', {
        id: newClientAdmin.id,
        username: newClientAdmin.username,
        email: newClientAdmin.email,
        company: newClientAdmin.company,
        role: newClientAdmin.role,
        credits: newClientAdmin.credits
      });
      console.log('Client Admin login credentials:');
      console.log('Email:', clientAdmin.email);
      console.log('Password:', clientAdminPassword);
      console.log('---');
    } catch (err) {
      console.error('ERROR creating Client Admin:', err.message);
    }
    
    // Create a regular test user
    const testUserPassword = 'TestUser123!';
    const testUserHash = await bcrypt.hash(testUserPassword, saltRounds);
    
    const testUser = {
      username: 'test_user',
      firstName: 'Test',
      lastName: 'User',
      email: 'test.user@example.com',
      password: testUserHash,
      company: 'Test Company Inc',
      role: 'user',
      credits: 100,
      emailVerified: true,
      canPurchaseCredits: true
    };
    
    console.log('Creating Test User...');
    try {
      const newTestUser = await storage.createUser(testUser);
      console.log('SUCCESS: Test User created:', {
        id: newTestUser.id,
        username: newTestUser.username,
        email: newTestUser.email,
        company: newTestUser.company,
        role: newTestUser.role,
        credits: newTestUser.credits
      });
      console.log('Test User login credentials:');
      console.log('Email:', testUser.email);
      console.log('Password:', testUserPassword);
      console.log('---');
    } catch (err) {
      console.error('ERROR creating Test User:', err.message);
    }
    
    console.log('\n=== SUMMARY ===');
    console.log('Admin users have been created with the following roles:');
    console.log('- business_admin: Full platform management access');
    console.log('- client_admin: Client company management access');
    console.log('- user: Regular customer access');
    console.log('\nAll accounts are pre-verified and ready to use.');
    console.log('Make sure to change these default passwords in production!');
    
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
};

createAdminUsers();