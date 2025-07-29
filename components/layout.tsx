import { ReactNode, useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/hooks/use-auth";
import { usePathname, useRouter } from "next/navigation";
import { CurrencySelector } from "@/components/currency-selector";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function Layout({ children, title, description }: LayoutProps) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated && !pathname.startsWith("/login") && !pathname.startsWith("/register")) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, pathname, router]);

  // Redirect to dashboard if authenticated and trying to access login/register
  useEffect(() => {
    if (!loading && isAuthenticated && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
      router.push("/");
    }
  }, [isAuthenticated, loading, pathname, router]);

  // Special case for login and register pages
  if (pathname === "/login" || pathname === "/register") {
    return <div className="min-h-screen bg-webflow-bg">{children}</div>;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-webflow-bg">
        <div className="animate-spin w-10 h-10 border-4 border-webflow-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Protected routes require authentication
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-webflow-dark-background">
      {/* Sidebar for desktop */}
      <Sidebar className="hidden md:block" />

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-y-auto pt-0 md:pt-0">
        {/* Mobile nav */}
        <MobileNav
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 mt-16 md:mt-0">
          {(title || description) && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                {title && <h1 className="text-2xl font-semibold text-webflow-heading">{title}</h1>}
                {description && <p className="mt-1 text-sm text-webflow-text-white opacity-80">{description}</p>}
              </div>
              <div className="mt-4 md:mt-0">
                <CurrencySelector />
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
