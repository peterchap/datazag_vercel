import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

// This is an async Server Component, which is fast and efficient for public pages.
export async function PublicLayout({ children }: { children: React.ReactNode }) {
  // We can securely check for a session on the server to show the correct buttons.
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header for Public Pages */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            {/* Your Logo */}
            <span className="font-bold">Datazag</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/docs" className="transition-colors hover:text-foreground/80 text-foreground/60">Docs</Link>
            <Link href="/pricing" className="transition-colors hover:text-foreground/80 text-foreground/60">Pricing</Link>
            <Link href="/blog" className="transition-colors hover:text-foreground/80 text-foreground/60">Blog</Link>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {session?.user ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Log In</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content area where the page's specific content will be rendered */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer for Public Pages */}
      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              &copy; {new Date().getFullYear()} Datazag. All rights reserved.
            </p>
          </div>
          {/* You can add footer links here if you need them */}
        </div>
      </footer>
    </div>
  );
}

