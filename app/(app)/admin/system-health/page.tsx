import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/shared/schema";
import { fetchSystemHealth } from "@/lib/admin-server-data";
import { SystemHealthClient } from "@/components/admin/system-health/health-client";

export default async function SystemHealthPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    redirect("/login");
  }

  const initialHealthStatus = await fetchSystemHealth();

  return <SystemHealthClient initialHealthStatus={initialHealthStatus} />;
}