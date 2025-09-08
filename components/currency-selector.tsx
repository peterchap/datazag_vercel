'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define the shape of the context
interface CurrencyContextType {
  currency: { code: string; rate: number };
  setCurrencyCode: (code: string) => void;
  formatPrice: (amountInUsdCents: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Define the available currencies with their symbols and names
const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
];

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<{ [key: string]: number }>({ USD: 1.0 });
  const [currencyCode, setCurrencyCodeState] = useState('USD');

  // Fetch exchange rates when the app loads
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/exchange-rates');
        const data = await response.json();
        if (data.success) {
          setRates(data.rates);
        } else {
          console.error("API failed to provide exchange rates:", data.error);
        }
      } catch (error) {
        console.error("Failed to fetch currency rates:", error);
      }
    };
    fetchRates();

    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency) {
      setCurrencyCodeState(savedCurrency);
    }
  }, []);

  const setCurrencyCode = (code: string) => {
    // This new log will help us debug what value the Select component is passing.
    console.log("Setting currency code to:", code, "(Type:", typeof code, ")");
    setCurrencyCodeState(code);
    localStorage.setItem('selectedCurrency', code);
  };

  const formatPrice = useCallback((amountInUsdCents: number) => {
    const rate = rates[currencyCode] || 1;
    const amountInUsd = amountInUsdCents / 100;
    const convertedAmount = amountInUsd * rate;

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(convertedAmount);
    } catch (error) {
        console.warn(`Failed to format currency for code: ${currencyCode}. Falling back to USD.`);
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amountInUsd);
    }
  }, [currencyCode, rates]);

  // By wrapping the context value in useMemo, we ensure consuming components
  // only re-render when a value they depend on has actually changed. This is the fix.
  const value = useMemo(() => ({
    currency: { code: currencyCode, rate: rates[currencyCode] || 1 },
    setCurrencyCode,
    formatPrice,
  }), [currencyCode, rates, formatPrice, setCurrencyCode]);


  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

// Custom hook to easily access the currency context
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// This is the UI component for the dropdown selector
export function CurrencySelector() {
  const { currency, setCurrencyCode } = useCurrency();

  return (
    <Select value={currency.code} onValueChange={setCurrencyCode}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select currency" />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.code} - {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}