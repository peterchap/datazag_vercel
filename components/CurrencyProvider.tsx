'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';

// Define the shape of the context data
interface CurrencyContextType {
  rates: { [key: string]: number } | null;
  selectedCurrency: string;
  currencies: { code: string; name: string; }[];
  setSelectedCurrency: (currency: string) => void;
  formatPrice: (basePriceInCents: number) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only one fetch call is needed now
    fetch('/api/exchange-rates')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRates(data.rates);
          setCurrencies(data.currencies);
        }
      })
      .catch(error => console.error("Failed to load currency data:", error))
      .finally(() => setIsLoading(false));
  }, []);

  // A memoized function to format prices, preventing recalculations
  const formatPrice = useMemo(() => (basePriceInCents: number): string => {
    if (isLoading || !rates || !rates[selectedCurrency]) {
      return "---"; // Return a placeholder while loading to prevent NaN
    }
    const convertedAmount = (basePriceInCents * rates[selectedCurrency]) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedCurrency,
    }).format(convertedAmount);
  }, [rates, selectedCurrency, isLoading]);

  const value = { rates, currencies, selectedCurrency, setSelectedCurrency, formatPrice, isLoading };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};