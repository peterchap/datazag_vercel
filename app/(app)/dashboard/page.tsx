import { auth } from "@/lib/auth"; // Assuming this is your NextAuth.js config export
import { fetchUserData, fetchUserTransactions } from "@/lib/server-data";
import { DashboardClient } from "@/components/dashboard-client"; // Import the client component you have open
import { redirect } from "next/navigation";
import type { User } from "@/shared/schema";

// This is an async Server Component. It runs only on the server.
export default async function DashboardPage() {
  const session = await auth();

  // Redirect if no session is found. This is a safeguard, though middleware should handle it.
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Fetch the initial data securely on the server before the page loads.
  const initialUserData = await fetchUserData(session.user.id);
  const initialTransactions = await fetchUserTransactions(session.user.id);

  // 2. Return the CLIENT component (your currently open file) and pass the fetched data as props.
  //    This is a valid JSX element, which is what Next.js expects a page to export.
  return (
    <DashboardClient
      initialUserData={initialUserData as User | null}
      initialTransactions={initialTransactions}
    />
  );
}
