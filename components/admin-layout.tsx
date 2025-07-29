import { ReactNode, useEffect } from "react";
import WebflowLayout from "@/components/webflow-layout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

/**
 * AdminLayout - Extends WebflowLayout with admin-specific styling and navigation
 * Uses the Datazag color scheme and styling
 */
export default function AdminLayout({ 
  children, 
  title,
  description
}: AdminLayoutProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, loading]);
  
  // Define admin navigation items
  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/discount-codes', label: 'Discount Codes' },
    { href: '/admin/requests', label: 'Admin Requests' },
  ];
  
  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-webflow-bg">
        <div className="animate-spin h-10 w-10 border-4 border-webflow-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // If not authenticated, don't render anything (redirect will happen)
  if (!isAuthenticated && !loading) {
    return null;
  }
  
  return (
    <WebflowLayout 
      darkMode={true} // Use dark theme to match Datazag styling
      title={title}
      description={description}
    >
      <div className="flex flex-col md:flex-row gap-6 max-w-7xl mx-auto px-4">
        {/* Admin Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-webflow-card-bg rounded-lg shadow-lg p-4">
            <div className="mb-6">
              <h3 className="text-webflow-heading font-semibold text-xl mb-2">Admin Portal</h3>
              <p className="text-webflow-accent text-sm">
                {user?.username ? `Logged in as ${user.username}` : 'Admin Controls'}
              </p>
            </div>
            
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                >
                  <a 
                    className={`block py-2 px-3 rounded transition-colors ${
                      pathname === item.href 
                        ? 'bg-webflow-primary text-white' 
                        : 'text-webflow-text-white hover:bg-webflow-card-bg hover:text-webflow-heading'
                    }`}
                  >
                    {item.label}
                  </a>
                </Link>
              ))}
            </nav>
            
            <div className="mt-8 pt-4 border-t border-webflow-border">
              <Link href="/dashboard">
                <a className="flex items-center text-webflow-accent hover:text-webflow-heading transition-colors">
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    className="mr-2"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Back to Customer Portal
                </a>
              </Link>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1">
          <div className="bg-webflow-card-bg rounded-lg shadow-lg p-6">
            {children}
          </div>
        </main>
      </div>
    </WebflowLayout>
  );
}