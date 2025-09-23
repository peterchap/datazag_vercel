"use client";

import { SessionProvider } from "next-auth/react";
import { AuthRedirect } from '@/components/auth/auth-redirect';
import { ThemeProvider } from "next-themes";
import { CurrencyProvider } from "@/components/currency-selector"; // Import the new provider

export function Providers({ children, session }: { 
  children: React.ReactNode
  session: any; // Adjust the type according to your session object 
}) { 
  return (
    <SessionProvider session={session}>
      <AuthRedirect>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Wrap the application with the CurrencyProvider */}
          <CurrencyProvider>
            {children}
          </CurrencyProvider>
        </ThemeProvider>
      </AuthRedirect>
    </SessionProvider>
  );
}