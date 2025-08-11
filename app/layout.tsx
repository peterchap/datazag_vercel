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
      <body style={{fontFamily: 'Inter, system-ui, sans-serif', margin: 0, padding: 0}}>
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
