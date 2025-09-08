import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchUserData } from "@/lib/server-data"; // We can reuse the same data fetching function
import { ProfileClient } from "@/components/settings/settings-client";
import type { User } from "@/shared/schema";

// This is the new async Server Component for your settings/profile page.
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Fetch the user's full profile on the server.
  const initialUser = await fetchUserData(session.user.id);

  // 2. Render your client component, passing the full user object as a prop.
  return <ProfileClient initialUser={initialUser as User | null} />;
}