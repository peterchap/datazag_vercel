import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { USER_ROLES } from '@/shared/schema';

// This is the new, unified API route for fetching a client admin's company users.
export async function GET() {
  const session = await auth();

  // 1. Secure the endpoint to ensure only client admins can access it
  if (!session?.user || (session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // 2. First, get the client admin's own user record to find their company name
    const adminUser = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: {
            company: true,
        }
    });

    if (!adminUser?.company) {
        return NextResponse.json({ error: "Admin's company not found." }, { status: 400 });
    }

    // 3. Then, fetch all users who belong to that same company
    const companyUsers = await db.query.users.findMany({
        where: eq(users.company, adminUser.company),
        orderBy: (users, { asc }) => [asc(users.firstName)],
        // Only select the columns needed for the client to reduce payload size
        columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            credits: true,
            canPurchaseCredits: true,
        }
    });

    return NextResponse.json(companyUsers);

  } catch (error) {
    console.error('Error fetching company users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}