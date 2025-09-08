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
  Server
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
  Server
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
  isAdmin: boolean;
}

export function SidebarNav({ navItems, adminNavItems, isAdmin }: SidebarNavProps) {
  const pathname = usePathname(); // This hook gets the current URL path

  // A helper function to render a single link, reducing code duplication
  const renderLink = (item: NavItem) => {
    const Icon = iconMap[item.iconName]; // Look up the icon component from the map
    const isActive = pathname === item.href; // Check if the link is for the current page

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
          isActive ? 'bg-muted text-primary' : '' // Apply active styles
        }`}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <nav className="flex-1 space-y-1 py-4">
      {/* Render the standard navigation items */}
      {navItems.map(renderLink)}

      {/* Conditionally render the admin section based on the prop from the server */}
      {isAdmin && (
        <>
          <div className="my-4 h-px bg-border" />
          <h3 className="px-4 text-xs font-semibold uppercase text-muted-foreground">Admin</h3>
          {adminNavItems.map(renderLink)}
        </>
      )}
    </nav>
  );
}