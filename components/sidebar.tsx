import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, User, Coins, Key, FileText, Settings, LogOut,
  BarChart3, LineChart, Users, Percent, Upload
} from "lucide-react";
import { USER_ROLES } from "@shared/schema";
import NotificationBell from "./notification-bell";

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

function Sidebar({ className, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Check if user has an admin role (CLIENT_ADMIN or BUSINESS_ADMIN)
  // Use case-insensitive comparison to handle 'BUSINESS_ADMIN' vs 'business_admin' issues
  const isAdmin = user && user.role && (
    user.role.toLowerCase() === USER_ROLES.CLIENT_ADMIN.toLowerCase() || 
    user.role.toLowerCase() === USER_ROLES.BUSINESS_ADMIN.toLowerCase()
  );

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/credits", label: "Credits", icon: Coins },
    { href: "/api-keys", label: "API Keys", icon: Key },
    { href: "/file-uploads", label: "File Uploads", icon: Upload },
    { href: "/transactions", label: "Transactions & Analytics", icon: BarChart3 },
    { href: "/documentation", label: "Documentation", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  
  // Check if user is a business admin (has full system access) - case insensitive comparison
  const isBizAdmin = user?.role?.toLowerCase() === USER_ROLES.BUSINESS_ADMIN.toLowerCase();
  
  // Add debug logs
  console.log("Current user:", user);
  console.log("User role:", user?.role);
  console.log("Is business admin?", isBizAdmin);
  
  // Admin navigation items
  const adminNavItems = [
    { href: "/admin/dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
    // Show User Management only to business_admin users
    ...(isBizAdmin ? [
      { href: "/admin/users", label: "User Management", icon: Users },
    ] : []),
    { href: "/admin/discount-codes", label: "Discount Codes", icon: Percent },
  ];

  const handleLogout = async () => {
    await logout();
    if (onClose) onClose();
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
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center px-4 py-2 text-sm font-medium rounded-md",
                  isActive
                    ? "text-webflow-text-white bg-webflow-primary/90 border-l-3 border-webflow-accent"
                    : "text-webflow-text-white hover:bg-webflow-secondary hover:text-webflow-heading"
                )}
              >
                <item.icon className={cn("mr-3 text-lg h-5 w-5", isActive ? "text-webflow-accent" : "text-webflow-primary")} />
                {item.label}
              </Link>
            );
          })}

          {/* Admin section - Only visible to admins */}
          {isAdmin && (
            <>
              <div className="mt-8 mb-2 px-4">
                <h3 className="text-xs font-semibold text-webflow-accent uppercase tracking-wider">
                  Admin
                </h3>
              </div>
              
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center px-4 py-2 text-sm font-medium rounded-md",
                      isActive
                        ? "text-webflow-text-white bg-webflow-primary/90 border-l-3 border-webflow-accent"
                        : "text-webflow-text-white hover:bg-webflow-secondary hover:text-webflow-heading"
                    )}
                  >
                    <item.icon className={cn("mr-3 text-lg h-5 w-5", isActive ? "text-webflow-accent" : "text-webflow-primary")} />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </div>
      <div className="flex-shrink-0 p-4 border-t border-webflow-border">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-webflow-primary/20 flex items-center justify-center text-webflow-accent font-medium">
              {user?.email?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-webflow-text-white">{user?.email}</p>
            <p className="text-xs font-medium text-webflow-accent opacity-80">{user?.company || "Personal Account"}</p>
          </div>
          <button
            className="ml-auto p-1 rounded-full text-webflow-text-white hover:text-webflow-accent"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
