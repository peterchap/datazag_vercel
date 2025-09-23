import { Inter, Outfit } from 'next/font/google';
import { CurrencyProvider } from '@/components/CurrencyProvider'; // Adjust path if needed
import { Toaster } from "@/components/ui/toaster"
import { auth } from '@/lib/auth'
import { Providers } from './providers';
import './globals.css';
import type { Metadata } from 'next';
import { Currency } from 'lucide-react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-heading',
});

export const metadata: Metadata = {
  title: 'Datazag Customer Portal',
  description: 'Customer Portal',
};


export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body>

        <CurrencyProvider>
          <Toaster />
          <Providers session={session}>
            {children}
          </Providers>
        </CurrencyProvider>
      </body>
    </html>
  );
}