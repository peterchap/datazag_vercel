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

export async function GET(request: NextRequest) {
  try {
    // For now, return mock user data
    // In production, this would validate the session and return real user data
    return NextResponse.json(mockUser);
  } catch (error) {
    console.error('Error in /api/me:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}
