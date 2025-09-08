// Sidebar server component

import { auth, signOut } from "@/lib/auth";
import { USER_ROLES } from "@/shared/schema";
import { SidebarNav } from "./sidebar-nav";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
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
  List
} from "lucide-react";
import { CurrencySelector } from "../currency-selector";

// This is an async Server Component, which is fast and secure.
export async function Sidebar() {
  const session = await auth();
  const userRole = session?.user?.role;

  const isAdmin = userRole === USER_ROLES.BUSINESS_ADMIN || userRole === USER_ROLES.CLIENT_ADMIN;

  // Define a comprehensive list of navigation links
  const navItems = [
    { href: "/dashboard", iconName: "Home" as const, label: "Dashboard" },
    { href: "/api-keys", iconName: "Key" as const, label: "API Keys" },
    { href: "/credits", iconName: "CreditCard" as const, label: "Buy Credits" },
    { href: "/billing", iconName: "CreditCard" as const, label: "Payment History" },
    { href: "/file-uploads", iconName: "List" as const, label: "Bulk File Uploads" },
    { href: "/api-documentation", iconName: "BarChart2" as const, label: "API Documentation" },
    { href: "/customer-requests", iconName: "Ticket" as const, label: "Customer Requests" },
    { href: "/settings", iconName: "Settings" as const, label: "Settings" },
  ];

  const adminNavItems = [
    { href: "/admin", iconName: "Shield" as const, label: "Admin Overview" },
    { href: "/admin/users", iconName: "Users" as const, label: "Manage Users" },
    { href: "/admin/transactions", iconName: "List" as const, label: "Transactions" },
    { href: "/admin/jobs", iconName: "Server" as const, label: "Manage Jobs" },
    { href: "/admin/system-health", iconName: "HeartPulse" as const, label: "System Health" },
    { href: "/admin/requests", iconName: "Ticket" as const, label: "Admin Requests" },
    { href: "/api-documentation", iconName: "BarChart2" as const, label: "API Documentation" },
  ];

  return (
    // This div provides the full-height structure for the sidebar.
    <div className="flex h-full flex-col border-r bg-muted/20 p-4">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex flex-col items-start gap-1 font-semibold">
          <Image 
            src="/dz-logo.png" 
            alt="Datazag Logo" 
            width={120} 
            height={32} 
            className="h-8 w-auto"
          />
          <span className="text-[1.2rem] font-bold text-muted-foreground w-full text-center">Customer Portal</span>
        </Link>
      </div>

      {/* The client component now renders the more detailed navigation lists. */}
      <SidebarNav navItems={navItems} adminNavItems={adminNavItems} isAdmin={isAdmin} />

      {/* The theme toggle and new logout button are placed at the bottom */}
      <div className="mt-auto space-y-2">
         <CurrencySelector />
         <ThemeToggle />
         <form
            action={async () => {
              'use server';
              await signOut();
            }}
          >
            <Button variant="ghost" className="w-full justify-start gap-3 px-3 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          </form>
      </div>
    </div>
  );
}