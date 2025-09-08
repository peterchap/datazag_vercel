import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findUserByEmail } from '@/lib/db';

const checkEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = checkEmailSchema.parse(body);

    // Check if email is already registered
    const existingUser = await findUserByEmail(email);
    
    return NextResponse.json({
      available: !existingUser,
    });

  } catch (error) {
    console.error('Email check error:', error);
    return NextResponse.json(
      { available: null },
      { status: 500 }
    );
  }
}