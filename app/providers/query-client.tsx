"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { CurrencyProvider } from "@/components/currency-selector"; // Import the new provider

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {/* Wrap the application with the CurrencyProvider */}
        <CurrencyProvider>
          {children}
        </CurrencyProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}