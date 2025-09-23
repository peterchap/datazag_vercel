// app/providers.tsx
"use client";

import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/hooks/use-auth';
import { CurrencyProvider } from '@/components/currency-selector';
import { SessionProvider } from 'next-auth/react';
import { AuthRedirect } from '@/components/auth/auth-redirect';

export function Providers({ 
  children,
  session 
}: { 
  children: React.ReactNode;
  session?: any;
}) {
  return (
    <SessionProvider session={session}>
      <AuthRedirect>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <CurrencyProvider>
              <AuthProvider>
                {children}
                <Toaster />
              </AuthProvider>
            </CurrencyProvider>
          </TooltipProvider>
        </ThemeProvider>
      </AuthRedirect>
    </SessionProvider>
  );
}