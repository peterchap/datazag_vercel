import { auth } from "@/lib/auth";
import { db } from '@/lib/drizzle';
import { fetchUserData, fetchUserTransactions } from "@/lib/server-data";
import { DashboardClient } from "@/components/dashboard-client";
import { redirect } from "next/navigation";
import { User, creditBundles } from "@/shared/schema";

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch all necessary initial data
  const initialUserData = await fetchUserData(session.user.id);
  const initialTransactions = await fetchUserTransactions(session.user.id);
  // 👇 You are correctly fetching the bundles here
  const bundles = await db
    .select({
      id: creditBundles.id,
      name: creditBundles.name,
      description: creditBundles.description,
      credits: creditBundles.credits,
      price_in_usd_cents: creditBundles.price, // Select 'price' and rename it
      popular: creditBundles.popular,
    })
    .from(creditBundles);

  // Normalize nullable fields to match CreditBundle type
  const normalizedBundles = bundles.map((b) => ({
    id: b.id,
    name: b.name,
    credits: b.credits,
    description: b.description ?? "",
    price_in_usd_cents: b.price_in_usd_cents,
    popular: b.popular ?? false,
  }));

  return (
    <DashboardClient
      initialUserData={initialUserData as User | null}
      initialTransactions={initialTransactions}
      // 👇 You just need to pass the fetched bundles as a prop
      initialBundles={normalizedBundles}
    />
  );
}
