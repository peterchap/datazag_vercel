import { auth } from "@/lib/auth";
import { fetchAdminOverviewStats, fetchAdminChartData } from "@/lib/admin-server-data";
import { AdminDashboardClient } from "@/components/admin/dashboard-client";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/shared/schema";

// This is an async Server Component.
export default async function AdminDashboardPage() {
  const session = await auth();

  // Protect the route on the server
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    redirect("/login");
  }

  // Fetch all the initial data in parallel for a faster page load
  const [initialStats, initialChartData] = await Promise.all([
    fetchAdminOverviewStats(),
    fetchAdminChartData()
  ]);

  // Render the client component, passing all the live data as props
  return (
    <AdminDashboardClient 
      initialStats={initialStats} 
      initialChartData={initialChartData} 
    />
  );
}