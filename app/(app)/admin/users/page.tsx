import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/shared/schema";
import { fetchAllUsers } from "@/lib/admin-server-data";
// Adjust the import path and extension if needed
import { UserListClient } from "@/components/admin/users/user-list-client";

// This is the new async Server Page for the user management list.
export default async function ManageUsersPage() {
  const session = await auth();
  
  // Server-side protection to ensure only admins can see this page
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    redirect("/login");
  }

  // 1. Fetch the initial list of all users from the server.
  const initialUsers = await fetchAllUsers();

  // 2. Render the client component, passing the user data as props.
  return <UserListClient initialUsers={initialUsers} />;
}