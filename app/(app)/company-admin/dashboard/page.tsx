import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/shared/schema";
import { CompanyAdminDashboardClient } from "@/components/client-admin/dashboard-client";
// We will create a new server data fetching function
import { fetchCompanyUsers } from "@/lib/client-admin-server-data"; 

export default async function CompanyAdminDashboardPage() {
  const session = await auth();
  
  if (
    !session?.user || 
    (session.user.role !== USER_ROLES.CLIENT_ADMIN)
  ) {
    redirect("/dashboard"); 
  }

  // Fetch the initial list of users for the admin's company
  const initialCompanyUsers = await fetchCompanyUsers(session.user.id);

  // Normalize to the component's expected type (numeric id)
  const normalizedCompanyUsers = initialCompanyUsers.map((u) => ({
    ...u,
    id: typeof u.id === "string" ? Number(u.id) : u.id,
  }));

  return <CompanyAdminDashboardClient initialUsers={normalizedCompanyUsers} />;
}