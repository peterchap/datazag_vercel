// Sidebar navigation Client Component

'use client'; // This directive is crucial; it marks this as a Client Component.

import Link from "next/link";
import { usePathname } from "next/navigation";

import { 
  type LucideIcon, 
  Home, 
  Settings, 
  BarChart2, 
  Shield, 
  Users, 
  Ticket,
  Key,
  CreditCard,
  HeartPulse,
  List,
  Server,
  FileUp,
  Building,
  MessageSquare,
  LifeBuoy
} from 'lucide-react';

// This mapping allows us to pass simple strings from the Server Component
// and render the actual icon components here on the client.
const iconMap: Record<string, LucideIcon> = {
  Home,
  Settings,
  BarChart2,
  Shield,
  Users,
  Ticket,
  Key,
  CreditCard,
  HeartPulse,
  List,
  Server,
  FileUp,
  Building,
  MessageSquare,
  LifeBuoy
};

// Define the shape of a single navigation item
interface NavItem {
  href: string;
  iconName: keyof typeof iconMap; // The prop is now a string name of the icon
  label: string;
}

// Define the props for the entire navigation component
interface SidebarNavProps {
  navItems: NavItem[];
  adminNavItems: NavItem[];
  clientAdminNavItems: NavItem[];
  isBusinessAdmin: boolean;
  isClientAdmin: boolean;
  isAdmin: boolean;
}

export function SidebarNav({ navItems, adminNavItems, clientAdminNavItems, isBusinessAdmin, isClientAdmin }: SidebarNavProps) {
  const pathname = usePathname();

  const renderLink = (item: NavItem) => {
    const Icon = iconMap[item.iconName];
    const isActive = pathname === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
          isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
        }`}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <nav className="flex-1 space-y-1 py-4">
      {navItems.map(renderLink)}

      {/* Show the full admin panel only to Business Admins */}
      {isBusinessAdmin && (
        <>
          <div className="my-4 h-px bg-border" />
          <h3 className="px-4 text-xs font-semibold uppercase text-muted-foreground" style={{ paddingTop: '20px' }}>System Admin</h3>
          {adminNavItems.map(renderLink)}
        </>
      )}
      
      {/* Show the new Company Admin panel only to Client Admins */}
      {isClientAdmin && (
        <>
          <div className="my-4 h-px bg-border" />
          <h3 className="px-4 text-xs font-semibold uppercase text-muted-foreground" style={{ paddingTop: '20px' }}>
            Company Admin
          </h3>
          {clientAdminNavItems.map(renderLink)}
        </>
      )}
    </nav>
  );
}