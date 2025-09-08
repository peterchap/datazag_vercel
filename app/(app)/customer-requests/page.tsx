import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchUserRequests } from "@/lib/admin-server-data";
import { RequestsClient } from "@/components/customer-requests/requests-client";

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch the initial list of the user's past requests from the server.
  const initialRequests = await fetchUserRequests(session.user.id);

  // Render the client component, passing the request data as props.
  return <RequestsClient initialRequests={initialRequests} />;
}