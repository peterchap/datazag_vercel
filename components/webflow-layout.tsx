import { ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePathname, useRouter } from "next/navigation";
import { CurrencySelector } from "@/components/currency-selector";

interface WebflowLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  hideAuth?: boolean; // Set to true for public pages
  darkMode?: boolean; // Use dark background for the entire layout
}

/**
 * DatazagLayout - A layout component designed to match Datazag styling
 * This component provides a consistent wrapper for the React application
 * that matches the look and feel of your Datazag Webflow site
 */
export default function WebflowLayout({ 
  children, 
  title, 
  description,
  hideAuth = false,
  darkMode = false
}: WebflowLayoutProps) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Handle authentication redirects if hideAuth is false
  useEffect(() => {
    if (hideAuth) return; // Skip auth checks for public pages
    
    if (!loading && !isAuthenticated && !pathname.startsWith("/login") && !pathname.startsWith("/register")) {
      router.push("/login");
    }
    
    if (!loading && isAuthenticated && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, pathname, router, hideAuth]);

  // Special case for login and register pages
  if (pathname === "/login" || pathname === "/register") {
    return (
      <div className="min-h-screen bg-webflow-dark-background">
        <div className="webflow-container mx-auto px-4 py-8">
          {children}
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading && !hideAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-webflow-dark-background">
        <div className="animate-spin w-10 h-10 border-4 border-webflow-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Protected routes require authentication if hideAuth is false
  if (!isAuthenticated && !hideAuth) {
    return null;
  }

  // Background class based on darkMode prop
  const bgClass = darkMode ? "bg-webflow-dark-background" : "bg-webflow-background";
  const textClass = darkMode ? "text-webflow-text-white" : "text-webflow-text";

  return (
    <div className={`min-h-screen ${bgClass} font-webflow`}>
      {/* Datazag-style header */}
      <header className="w-full bg-webflow-nav py-2 md:py-4">
        <div className="webflow-container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <a href="/" className="text-2xl font-bold text-webflow-primary">
              <span className="text-webflow-text-white">Data</span><span className="text-webflow-primary">zag</span>
            </a>
          </div>
          
          <div className="flex items-center space-x-4">
            <a href="/" className="text-webflow-text-white hover:text-webflow-primary transition-colors">
              Home
            </a>
            <a href="/documentation" className="text-webflow-text-white hover:text-webflow-primary transition-colors">
              Docs
            </a>
            <a href="/pricing" className="text-webflow-text-white hover:text-webflow-primary transition-colors">
              Pricing
            </a>
            <a href="/blog" className="text-webflow-text-white hover:text-webflow-primary transition-colors">
              Blog
            </a>
            
            {isAuthenticated ? (
              <>
                <CurrencySelector />
                <a 
                  href="/dashboard" 
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                >
                  Customer Portal
                </a>
              </>
            ) : (
              <>
                <a href="/login" className="text-webflow-text-white hover:text-webflow-primary transition-colors">
                  Log In
                </a>
                <a 
                  href="/register" 
                  className="bg-webflow-primary text-white px-4 py-2 rounded hover:bg-webflow-primary-dark transition-colors"
                >
                  Get Started
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className={`${bgClass} ${textClass}`}>
        {(title || description) && (
          <div className="py-12 text-center">
            {title && <h1 className="text-3xl md:text-4xl font-bold text-webflow-heading">{title}</h1>}
            {description && <p className="mt-4 text-lg text-webflow-accent">{description}</p>}
          </div>
        )}
        {children}
      </main>

      {/* Datazag-style footer */}
      <footer className="w-full bg-webflow-footer py-12 text-webflow-text-white">
        <div className="webflow-container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <h3 className="text-xl font-semibold text-webflow-text-white">
                <span className="text-webflow-text-white">Data</span><span className="text-webflow-primary">zag</span>
              </h3>
              <p className="mt-2 text-webflow-text-white opacity-70">
                Comprehensive Domain Intelligence
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-medium text-webflow-text-white mb-3">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-webflow-text-white opacity-70 hover:text-webflow-primary transition-colors">About</a></li>
                  <li><a href="#" className="text-webflow-text-white opacity-70 hover:text-webflow-primary transition-colors">Contact</a></li>
                  <li><a href="#" className="text-webflow-text-white opacity-70 hover:text-webflow-primary transition-colors">Pricing</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-webflow-text-white mb-3">Resources</h4>
                <ul className="space-y-2">
                  <li><a href="/documentation" className="text-webflow-text-white opacity-70 hover:text-webflow-primary transition-colors">Documentation</a></li>
                  <li><a href="#" className="text-webflow-text-white opacity-70 hover:text-webflow-primary transition-colors">Blog</a></li>
                  <li><a href="#" className="text-webflow-text-white opacity-70 hover:text-webflow-primary transition-colors">Support</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-webflow-text-white mb-3">Legal</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-webflow-text-white opacity-70 hover:text-webflow-primary transition-colors">Privacy</a></li>
                  <li><a href="#" className="text-webflow-text-white opacity-70 hover:text-webflow-primary transition-colors">Terms</a></li>
                  <li><a href="#" className="text-webflow-text-white opacity-70 hover:text-webflow-primary transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-webflow-border text-center text-webflow-text-white opacity-70">
            <p>&copy; {new Date().getFullYear()} Datazag. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}