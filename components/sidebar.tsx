// components/sidebar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, User, Coins, Key, FileText, Settings, LogOut,
  BarChart3, Users, Percent, Upload
} from "lucide-react";
import { USER_ROLES } from "@shared/schema";
import NotificationBell from "./notification-bell";

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

export default function Sidebar({ className, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Admin checks (case-insensitive role compare)
  const isAdmin = !!(user?.role && (
    user.role.toLowerCase() === USER_ROLES.CLIENT_ADMIN.toLowerCase() ||
    user.role.toLowerCase() === USER_ROLES.BUSINESS_ADMIN.toLowerCase()
  ));
  const isBizAdmin = user?.role?.toLowerCase() === USER_ROLES.BUSINESS_ADMIN.toLowerCase();

  // Smarter active-state: exact for most items, prefix for docs & doc subpages
  const activeFor = (href: string) => {
    if (!pathname) return false;
    // docs root should be active for any nested docs
    if (href === "/docs") return pathname === "/docs" || pathname.startsWith("/docs/");
    // sub-pages should allow nested paths
    if (href.startsWith("/docs/")) return pathname === href || pathname.startsWith(href + "/");
    // everything else: exact match
    return pathname === href;
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/credits", label: "Credits", icon: Coins },
    { href: "/api-keys", label: "API Keys", icon: Key },
    { href: "/file-uploads", label: "File Uploads", icon: Upload },
    { href: "/transactions", label: "Transactions & Analytics", icon: BarChart3 },
    // ---- Docs area
    { href: "/docs", label: "Docs", icon: FileText },
    { href: "/docs/domain-intel", label: "Domain Intelligence API", icon: FileText },
    // ----
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const adminNavItems = [
    { href: "/admin/dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
    ...(isBizAdmin ? [{ href: "/admin/users", label: "User Management", icon: Users }] : []),
    { href: "/admin/discount-codes", label: "Discount Codes", icon: Percent },
  ];

  const handleLogout = async () => {
    await logout();
    onClose?.();
  };

  return (
    <div className={cn("flex flex-col w-64 bg-webflow-card-bg border-r border-webflow-border", className)}>
      <div className="flex items-center h-16 px-4 border-b border-webflow-border">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#56A8F5] to-[#37DEF5] inline-block text-transparent bg-clip-text">
          Datazag
        </h1>
        <div className="ml-auto flex items-center">
          {isAdmin && <NotificationBell />}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-md text-webflow-text-white hover:text-webflow-heading hover:bg-webflow-secondary"
              aria-label="Close sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-grow overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeFor(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                  active
                    ? "bg-webflow-secondary text-webflow-heading"
                    : "text-webflow-text-white hover:bg-webflow-secondary hover:text-webflow-heading"
                )}
              >
                <Icon className={cn("mr-3 h-5 w-5", active ? "text-webflow-heading" : "text-webflow-text-white")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {isAdmin && (
          <>
            <div className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-webflow-text-white/70">Admin</div>
            <nav className="px-2 pb-4 space-y-1">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const active = activeFor(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                      active
                        ? "bg-webflow-secondary text-webflow-heading"
                        : "text-webflow-text-white hover:bg-webflow-secondary hover:text-webflow-heading"
                    )}
                  >
                    <Icon className={cn("mr-3 h-5 w-5", active ? "text-webflow-heading" : "text-webflow-text-white")} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </>
        )}

        <div className="mt-auto px-2 py-3 border-t border-webflow-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-webflow-text-white hover:bg-webflow-secondary hover:text-webflow-heading"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}