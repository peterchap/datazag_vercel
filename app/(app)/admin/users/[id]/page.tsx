import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/drizzle";
import { users, apiKeys, transactions, apiUsage } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { USER_ROLES } from "@/shared/schema";
import { UserDetailClient } from "@/components/admin/users/user-detail-client";
import { notFound } from "next/navigation";

// This server function fetches ALL data related to a single user in parallel.
async function getUserDetails(userId: number) {
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

// This is the new async Server Page for the dynamic user detail route.
export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  
  // Server-side protection
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    redirect("/login");
  }

  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) {
    notFound(); // If the ID is not a valid number, show a 404 page.
  }

  // 1. Fetch all the data for this user from the server.
  const { userData, userApiKeys, userTransactions, userApiUsage } = await getUserDetails(userId);

  // If the user doesn't exist, show a 404 page.
  if (!userData) {
    notFound();
  }

  // 2. Render the client component, passing all the fetched data as props.
  return (
    <UserDetailClient
      user={userData}
      apiKeys={userApiKeys}
      transactions={userTransactions}
      apiUsage={userApiUsage}
    />
  );
}