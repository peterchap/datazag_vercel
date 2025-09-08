import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { adminRequests } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { USER_ROLES } from '@/shared/schema';

// This handler will update the status of a specific admin request.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const requestId = parseInt(params.id, 10);
    const { status } = await request.json();

    // You could add validation here to ensure the status is a valid one
    
    await db.update(adminRequests)
      .set({ status: status, updatedAt: new Date() })
      .where(eq(adminRequests.id, requestId));

    return NextResponse.json({ success: true, message: 'Request status updated.' });

  } catch (error) {
    console.error('Error updating admin request status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}