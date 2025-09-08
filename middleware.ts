import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from "./lib/auth";
import { USER_ROLES } from "./shared/schema";

// Ensure middleware runs in the Node.js runtime for database access
export const runtime = 'nodejs';

export async function middleware(req: NextRequest) {
  const session = await auth();
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

  // If the user is logged in
  if (session?.user) {
    const userRole = session.user.role;

    // If a logged-in user lands on the root page, redirect them to their dashboard.
    if (pathname === '/') {
      const redirectUrl =
        userRole === USER_ROLES.BUSINESS_ADMIN || userRole === USER_ROLES.CLIENT_ADMIN
          ? "/admin"
          : "/dashboard";
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    // If they try to access login/register while logged in, redirect them to their dashboard
    if (isAuthRoute) {
      const redirectUrl =
        userRole === USER_ROLES.BUSINESS_ADMIN || userRole === USER_ROLES.CLIENT_ADMIN
          ? "/admin"
          : "/dashboard";
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    // If a regular user tries to access an admin route, redirect them
    if (isAdminRoute && userRole !== USER_ROLES.BUSINESS_ADMIN && userRole !== USER_ROLES.CLIENT_ADMIN) {
       return NextResponse.redirect(new URL("/dashboard", req.url));
    }

  } else {
    // If the user is not logged in:
    // THE FIX: Redirect from the root path '/' to '/login'
    // Also protect the dashboard and admin routes.
    if (isDashboardRoute || isAdminRoute || pathname === '/') {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

// Config to specify which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};