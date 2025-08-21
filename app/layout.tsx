'use client'

export const dynamic = 'force-dynamic'; // global client providers depend on runtime session/auth

import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { CurrencyProvider } from '@/components/currency-selector'
import { SessionProvider } from 'next-auth/react'
import dotenv from 'dotenv';
import './globals.css'

dotenv.config();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-inter m-0 p-0 bg-background text-foreground">
          <ThemeProvider attribute="class" defaultTheme="light">
            <SessionProvider>
              <AuthProvider>
                <CurrencyProvider>
                  <TooltipProvider>
                    {children}
                    <Toaster />
                  </TooltipProvider>
                </CurrencyProvider>
              </AuthProvider>
            </SessionProvider>
          </ThemeProvider>
      </body>
    </html>
  )
}
