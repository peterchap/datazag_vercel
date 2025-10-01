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

  const initialHealthStatusRaw = await fetchSystemHealth();

  // Map status to the expected union type
  const statusMap = {
    "operational": "Operational",
    "offline": "Offline",
    "degraded": "Degraded"
  } as const;

  const initialHealthStatus = initialHealthStatusRaw.map((item: any) => ({
    ...item,
    status: statusMap[(item.status?.toLowerCase() as keyof typeof statusMap)] ?? "Operational"
  }));

  return <SystemHealthClient initialHealthStatus={initialHealthStatus} />;
}