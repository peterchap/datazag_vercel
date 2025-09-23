import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/drizzle";
import { users, apiKeys, transactions, apiUsage } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { USER_ROLES } from "@/shared/schema";
import { UserDetailClient } from "@/components/admin/users/user-detail-client";
import { notFound } from "next/navigation";

// This server function remains the same.
async function getUserDetails(userId: string) {
  try {
    const [userData, userApiKeys, userTransactions, userApiUsage] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.query.apiKeys.findMany({ where: eq(apiKeys.userId, userId), orderBy: [desc(apiKeys.createdAt)] }),
      db.query.transactions.findMany({ where: eq(transactions.userId, userId), orderBy: [desc(transactions.createdAt)] }),
      db.query.apiUsage.findMany({ where: eq(apiUsage.userId, userId), orderBy: [desc(apiUsage.createdAt)] }),
    ]);

    return { userData, userApiKeys, userTransactions, userApiUsage };
  } catch (error) {
    console.error("Failed to fetch user details:", error);
    return { userData: null, userApiKeys: [], userTransactions: [], userApiUsage: [] };
  }
}

// --- This is the fix ---
// The page now correctly handles the params object as a Promise, which is what
// the build-time type checker is expecting for this specific route.
type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function UserDetailPage({ params: paramsPromise }: PageProps) {
  const session = await auth();
  
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    redirect("/login");
  }

  // We now 'await' the promise to get the actual params object.
  const params = await paramsPromise;

  const userId = params.id;
  if (Number.isNaN(Number(userId))) {
    notFound();
  }

  const { userData, userApiKeys, userTransactions, userApiUsage } = await getUserDetails(userId);

  if (!userData) {
    notFound();
  }

  return (
    <UserDetailClient
      user={userData}
      apiKeys={userApiKeys}
      transactions={userTransactions}
      apiUsage={userApiUsage}
    />
  );
}
