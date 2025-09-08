import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/shared/schema";
import { CompanyAdminDashboardClient } from "@/components/client-admin/dashboard-client";
// We will create a new server data fetching function
import { fetchCompanyUsers } from "@/lib/client-admin-server-data"; 

export default async function CompanyAdminDashboardPage() {
  const session = await auth();
  
  if (!session?.user || (session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    // Redirect if not a client admin
    redirect("/dashboard"); 
  }

  // Fetch the initial list of users for the admin's company
  const initialCompanyUsers = await fetchCompanyUsers(session.jwt);

  return <CompanyAdminDashboardClient initialUsers={initialCompanyUsers} />;
}