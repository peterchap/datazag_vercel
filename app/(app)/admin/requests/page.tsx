import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/shared/schema";
import { fetchAllAdminRequests } from "@/lib/admin-server-data";
import { AdminRequestsClient } from "@/components/admin/requests/admin-requests-client";

export default async function AdminRequestsPage() {
  const session = await auth();
  
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    redirect("/login");
  }

  // Fetch the initial list of all requests from the server.
  const initialRequests = await fetchAllAdminRequests();

  // Render the client component, passing the request data as props.
  return <AdminRequestsClient initialRequests={initialRequests} />;
}