import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ApiKeysClient } from "@/components/api-keys/api-keys-client";
import type { ApiKey } from "@/components/api-keys/api-keys-client";
import { db } from "@/lib/drizzle";
import { apiKeys } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";

// This is the new, unified Server Component for your API Keys page.
// It now fetches data directly from the database using Drizzle.
export default async function ApiKeysPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Fetch the initial list of API keys directly from the database.
  const rawApiKeys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, session.user.id),
      orderBy: [desc(apiKeys.createdAt)],
  });

  // This is the fix: We map the data to match the expected 'ApiKey' type.
  // The database returns `createdAt` (camelCase), but the client component expects `created_at` (snake_case).
  const initialApiKeys = rawApiKeys.map(key => ({
    ...key,
    created_at: key.createdAt, // Map the property to the correct name
  }));

  // 2. Render your client component, passing the correctly shaped data as props.
  return <ApiKeysClient initialApiKeys={initialApiKeys as ApiKey[]} />;
}