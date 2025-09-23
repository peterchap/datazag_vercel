import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { fetchUserData, fetchUserTransactions } from "@/lib/server-data";
import { User, creditBundles } from '@/shared/schema';
import { CreditsClient } from '@/components/credits/credits-client';

export default async function CreditsPage() {
  const session = await auth();

  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const initialUserData = await fetchUserData(userId);
  const initialTransactions = await fetchUserTransactions(userId);
  
  const rawBundles = await db
    .select({
      id: creditBundles.id,
      name: creditBundles.name,
      description: creditBundles.description,
      credits: creditBundles.credits,
      price_in_usd_cents: creditBundles.price, // Alias 'price' to match the frontend
      popular: creditBundles.popular,
    })
    .from(creditBundles);

  const bundles = rawBundles.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description ?? '',
    credits: b.credits,
    price_in_usd_cents: b.price_in_usd_cents,
    popular: b.popular ?? false,
  }));

  // Pass the fresh data as props to the client component
  return <CreditsClient 
    initialUserData={initialUserData as User | null}
    initialTransactions={initialTransactions}
    // 👇 You just need to pass the fetched bundles as a prop
    initialBundles={bundles}
    />;
}