import { LoginClient } from "@/components/auth/login-client";
import { Suspense } from "react";

// This is a simple loading component to show while the main form loads.
function LoginFormLoading() {
    return (
        <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
    )
}

export default function LoginPage() {
  return (
    // By wrapping the client component in a Suspense boundary, we allow it
    // to use client-side hooks like useSearchParams without breaking the
    // server-side build process.
    <Suspense fallback={<LoginFormLoading />}>
      <LoginClient />
    </Suspense>
  );
}
