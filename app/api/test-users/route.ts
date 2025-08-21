// API endpoint to create test users
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
// Using bcryptjs (pure JS) to avoid native module build issues in Next.js
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    console.log('Creating test users...');
    
    // Create test users with hashed passwords
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    
    const testUsers = [
      {
        firstName: 'DataZag',
        lastName: 'Admin',
        email: 'admin@datazag.com',
        password: hashedPassword,
        company: 'DataZag Inc',
        website: 'https://datazag.com',
        role: 'business_admin',
        canPurchaseCredits: true,
        credits: 1000,
        active: true,
        emailVerified: true
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'admin@acme.com',
        password: hashedPassword,
        company: 'Acme Corp',
        website: 'https://acme.com',
        role: 'client_admin',
        canPurchaseCredits: true,
        credits: 500,
        active: true,
        emailVerified: true
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'admin@techstart.com',
        password: hashedPassword,
        company: 'TechStart LLC',
        website: 'https://techstart.com',
        role: 'client_admin',
        canPurchaseCredits: true,
        credits: 300,
        active: true,
        emailVerified: true
      },
      {
        firstName: 'Mike',
        lastName: 'Wilson',
        email: 'user@acme.com',
        password: hashedPassword,
        company: 'Acme Corp',
        role: 'user',
        canPurchaseCredits: false,
        credits: 50,
        active: true,
        emailVerified: true
      },
      {
        firstName: 'Emma',
        lastName: 'Davis',
        email: 'developer@techstart.com',
        password: hashedPassword,
        company: 'TechStart LLC',
        role: 'user',
        canPurchaseCredits: false,
        credits: 25,
        active: true,
        emailVerified: true
      }
    ];

    const insertedUsers = await db.insert(users)
      .values(testUsers)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          company: users.company,
          canPurchaseCredits: users.canPurchaseCredits,
          active: users.active
        }
      })
      .returning() as any[];

    return NextResponse.json({
      success: true,
      message: 'Test users created successfully',
      users: insertedUsers.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        company: u.company,
        canPurchaseCredits: u.canPurchaseCredits,
        credits: u.credits
      })),
      testCredentials: {
        password: 'testpass123',
        users: testUsers.map(u => ({
          email: u.email,
          role: u.role,
          company: u.company,
          description: u.role === 'business_admin' ? 'Platform admin - full access' :
                      u.role === 'client_admin' ? 'Company admin - manage users & credits' :
                      'Regular user - API consumption only'
        }))
      }
    });

  } catch (error: any) {
    console.error('Error creating test users:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get all users
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        company: users.company,
        canPurchaseCredits: users.canPurchaseCredits,
        credits: users.credits
      })
      .from(users);

    return NextResponse.json({
      success: true,
      users: allUsers.map((u: any) => ({
        ...u,
        name: `${u.firstName} ${u.lastName}`
      })),
      summary: {
        total: allUsers.length,
        businessAdmins: allUsers.filter((u: any) => u.role === 'business_admin').length,
        clientAdmins: allUsers.filter((u: any) => u.role === 'client_admin').length,
        regularUsers: allUsers.filter((u: any) => u.role === 'user').length
      }
    });

  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
