import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(session.user.id, 10)),
        columns: { recoveryCodes: true }
    });

    if (!user) {
        return NextResponse.json({ count: 0 }, { status: 404 });
    }
    
    const codes = user.recoveryCodes ? JSON.parse(user.recoveryCodes) : [];
    const count = Array.isArray(codes) ? codes.length : 0;
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error counting recovery codes:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}