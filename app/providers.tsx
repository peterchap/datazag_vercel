// app/providers.tsx

"use client";

import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/hooks/use-auth';
import { CurrencyProvider } from '@/components/currency-selector';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  // This is where you nest all the providers
  return (
    <SessionProvider>
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
    </SessionProvider>
  );
}