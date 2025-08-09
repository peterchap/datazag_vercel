'use client'

import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { CurrencyProvider } from '@/components/currency-selector'
import './globals.css'
import { useState } from 'react'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }))

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} style={{fontFamily: 'Inter, system-ui, sans-serif', margin: 0, padding: 0}}>
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      </body>
    </html>
  )
}
