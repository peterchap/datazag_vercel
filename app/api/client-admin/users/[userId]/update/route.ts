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
    const updateData = JSON.parse(bodyText);

    const userId = params.userId;
    if (!userId) {
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
        eq(users.id, userId),
        eq(users.company, adminUser.company)
      )
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'User not found or not in your company' }, { status: 404 });
    }

    // Build update object with only allowed fields
    const allowedUpdates: any = {};
    if ('canPurchaseCredits' in updateData) {
      allowedUpdates.canPurchaseCredits = updateData.canPurchaseCredits;
    }
    if ('role' in updateData && ['client_user', 'client_admin'].includes(updateData.role)) {
      allowedUpdates.role = updateData.role;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ message: 'No valid fields to update' }, { status: 400 });
    }

    // Add timestamp
    allowedUpdates.lastLogin = new Date().toISOString();

    // Update the user
    const updatedUser = await db.update(users)
      .set(allowedUpdates)
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({ 
      message: 'User updated successfully',
      user: updatedUser[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}