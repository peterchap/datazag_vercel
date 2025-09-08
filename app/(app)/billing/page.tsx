import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchUserData, fetchUserPaymentHistory } from "@/lib/server-data";
import { BillingClient } from "@/components/billing/billing-client";

// This is the async Server Page for your billing and payment history.
export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch the initial data on the server for an instant page load.
  const [user, initialPaymentHistory] = await Promise.all([
    fetchUserData(session.user.id),
    fetchUserPaymentHistory(session.user.id)
  ]);

  // Render your client component, passing the data as props.
  return (
    <BillingClient
      user={user}
      initialPaymentHistory={initialPaymentHistory}
    />
  );
}