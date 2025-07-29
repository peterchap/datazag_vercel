import { NextRequest, NextResponse } from 'next/server';

// Mock user data for testing
const mockUser = {
  id: 1,
  firstName: "Test",
  lastName: "User", 
  email: "test@example.com",
  company: "Test Company",
  credits: 1000,
  role: "USER"
};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Simple test credentials for development
    if (email === "test@example.com" && password === "password") {
      // In production, you would validate against a real database
      // and set up proper session/JWT tokens
      
      return NextResponse.json(mockUser);
    }
    
    // Test admin user
    if (email === "admin@example.com" && password === "admin") {
      return NextResponse.json({
        ...mockUser,
        id: 2,
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        role: "BUSINESS_ADMIN"
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
