import { Suspense } from 'react';
import { VerifyEmailPendingClient } from '@/components/auth/verify-email-pending-client';

// This is a simple loading component to show while the main component loads.
function LoadingState() {
    return (
        <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
    );
}

// This page now correctly uses a Suspense boundary.
export default function VerifyEmailPendingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VerifyEmailPendingClient />
    </Suspense>
  );
}