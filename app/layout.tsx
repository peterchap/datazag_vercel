'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { CurrencyProvider } from '@/components/currency-selector'
import QueryProviders from './providers/query-client'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-inter m-0 p-0 bg-background text-foreground">
        <QueryProviders>
          <ThemeProvider attribute="class" defaultTheme="light">
            <AuthProvider>
              <CurrencyProvider>
                <TooltipProvider>
                  {children}
                  <Toaster />
                </TooltipProvider>
              </CurrencyProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryProviders>
      </body>
    </html>
  )
}
