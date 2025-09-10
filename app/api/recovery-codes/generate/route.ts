import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const plainTextCodes = Array.from({ length: 10 }, () => 
      `${randomBytes(2).toString('hex').toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
    );

    const hashedCodes = await Promise.all(
      plainTextCodes.map(code => bcrypt.hash(code, 10))
    );
    
    await db.update(users)
      .set({ recoveryCodes: JSON.stringify(hashedCodes) })
      .where(eq(users.id, parseInt(session.user.id, 10)));
    
    return NextResponse.json({ codes: plainTextCodes });
  } catch (error) {
    console.error('Error generating recovery codes:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}