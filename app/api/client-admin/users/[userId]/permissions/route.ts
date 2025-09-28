import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const bodyText = await req.text();
    const { canPurchaseCredits } = JSON.parse(bodyText);

    if (typeof canPurchaseCredits !== 'boolean') {
      return NextResponse.json({ message: 'canPurchaseCredits must be a boolean value' }, { status: 400 });
    }

    const userId = parseInt(params.userId);
    if (isNaN(userId)) {
      return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }

    // Verify admin is authorized
    if (!session.user.email) {
      return NextResponse.json({ message: 'User email not found in session' }, { status: 400 });
    }
    const adminUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email.toLowerCase())
    });

    if (!adminUser || adminUser.role !== 'client_admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Find and update the target user
    const targetUser = await db.query.users.findFirst({
      where: and(
        eq(users.id, userId.toString()),
        eq(users.company, adminUser.company)
      )
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'User not found or not in your company' }, { status: 404 });
    }

    // Update the user's permissions
    await db.update(users)
      .set({ 
        canPurchaseCredits,
        lastLogin: new Date().toISOString()
      })
      .where(eq(users.id, userId.toString()));

    return NextResponse.json({ 
      message: 'User permissions updated successfully',
      canPurchaseCredits
    });

  } catch (error) {
    console.error('Update permissions error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}