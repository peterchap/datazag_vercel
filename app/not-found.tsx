'use client'

// Dynamic to avoid prerender issues due to client-only root layout providers using session/auth hooks.
export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-bold">Page Not Found</h1>
      <p className="text-muted-foreground max-w-md">The page you are looking for doesn't exist or may have been moved.</p>
      <Link href="/" className="underline text-primary hover:opacity-80">Return to dashboard</Link>
    </div>
  );
}
