import { auth, signOut } from "@/lib/auth";
import { USER_ROLES } from "@/shared/schema";
import { SidebarNav } from "./sidebar-nav";
import Link from "next/link";
import Image from "next/image";
import { CurrencySelector } from "@/components/currency-selector";
import { Button } from "@/components/ui/button";
import {
  Home,
  Settings,
  BarChart2,
  Shield,
  Users,
  Ticket,
  Key,
  CreditCard,
  HeartPulse,
  LogOut,
  List,
  Server,
  FileUp,
  MessageSquare,
  Building,
  LifeBuoy,
} from "lucide-react";

// This is an async Server Component, which allows us to securely fetch session data.
export async function Sidebar() {
  const session = await auth();
  const user = session?.user;
  const isBusinessAdmin = user?.role === USER_ROLES.BUSINESS_ADMIN;
  const isClientAdmin = user?.role === USER_ROLES.CLIENT_ADMIN;

  // --- THIS IS THE MISSING CODE ---
  // These arrays define all the links for the user and admin sections.
  const navItems = [
    { href: "/dashboard", iconName: "Home" as const, label: "Dashboard" },
    { href: "/api-keys", iconName: "Key" as const, label: "API Keys" },
    { href: "/billing", iconName: "CreditCard" as const, label: "Billing" },
    { href: "/file-uploads", iconName: "FileUp" as const, label: "File Uploads" },
    { href: "/requests", iconName: "MessageSquare" as const, label: "My Requests" },
    { href: "/analytics", iconName: "BarChart2" as const, label: "Analytics" },
    { href: "/settings", iconName: "Settings" as const, label: "Settings" },
  ];

  const adminNavItems = [
    { href: "/admin/dashboard", iconName: "Shield" as const, label: "Admin Overview" },
    { href: "/admin/users", iconName: "Users" as const, label: "Manage Users" },
    { href: "/admin/jobs", iconName: "Server" as const, label: "Manage Jobs" },
    { href: "/admin/transactions", iconName: "List" as const, label: "Transactions" },
    { href: "/admin/requests", iconName: "Ticket" as const, label: "Admin Requests" },
    { href: "/admin/system-health", iconName: "HeartPulse" as const, label: "System Health" },
  ];
 
  const clientAdminNavItems = [
      { href: "/company-admin/dashboard", iconName: "Building" as const, label: "Company Dashboard" },
  ];

  return (
    <div className="flex h-full flex-col border-r bg-muted/20">
      {/* Header with Logo */}
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src="/attached_assets/dz-logo.png"
            alt="Datazag Logo"
            width={120}
            height={32}
            className="h-8 w-auto"
          />
        </Link>
      </div>

      {/* Main Navigation */}
      <SidebarNav
        navItems={navItems}
        adminNavItems={adminNavItems}
        clientAdminNavItems={clientAdminNavItems}
        isBusinessAdmin={isBusinessAdmin}
        isClientAdmin={isClientAdmin}
      />

      {/* User Profile & Actions Section */}
      <div className="mt-auto p-4 space-y-4 border-t">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold">{user?.name || user?.email}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <CurrencySelector />

        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </form>
      </div>
    </div>
  );
}