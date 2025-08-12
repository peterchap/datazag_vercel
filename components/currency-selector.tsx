import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Globe } from "lucide-react";

// Define the available currencies with their symbols and names
const currencyDefinitions = [
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

// Create a type to hold the currency information
export type CurrencyInfo = {
  code: string;
  symbol: string;
  name: string;
  rate: number;
};

// Default currency with rate=1 for USD
const defaultCurrency: CurrencyInfo = {
  code: "USD",
  symbol: "$",
  name: "US Dollar",
  rate: 1
};

// Create context to share currency info throughout the app
interface CurrencyContextType {
  currency: CurrencyInfo;
  setCurrency: (currency: CurrencyInfo) => void;
  convertPrice: (priceInUSDCents: number) => number;
  formatPrice: (priceInUSDCents: number) => string;
  currencies: CurrencyInfo[];
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Fetch exchange rates from our API
  const { data: exchangeRates, isLoading } = useQuery<Record<string, number>>({
  queryKey: ["/api/exchange-rates"],
  queryFn: async () => {
    const res = await fetch("/api/exchange-rates");
    if (!res.ok) throw new Error("Failed to fetch exchange rates");
    return res.json();
  },
  staleTime: 1000 * 60 * 60, // Cache for 1 hour
  refetchOnWindowFocus: false,
  gcTime: 3600000, // Keep the data cached for 1 hour
  initialData: {
    USD: 1.0,
    EUR: 0.93,
    GBP: 0.79,
    JPY: 155.0,
    CAD: 1.36,
    AUD: 1.52,
    CHF: 0.91,
    CNY: 7.23, 
    INR: 83.5,
    SGD: 1.35,
    ZAR: 18.61,
    NZD: 1.64
  }
});
  // Convert the currency definitions to include exchange rates
  const currencies: CurrencyInfo[] = currencyDefinitions.map(currency => {
    const rate = currency.code === "USD" 
      ? 1 
      : (exchangeRates && exchangeRates[currency.code] ? exchangeRates[currency.code] : 1);
    
    return {
      ...currency,
      rate
    };
  });

  // Get user's local currency based on browser locale
  const getLocalCurrency = (): CurrencyInfo => {
    try {
      const locale = navigator.language;
      const currencyCode = new Intl.NumberFormat(locale)
        .resolvedOptions().locale.split('-')[1] || 'USD';
      
      const found = currencyDefinitions.find((c) => c.code === currencyCode);
      return found ? { 
        ...found, 
        rate: exchangeRates?.[found.code] || 1 
      } : defaultCurrency;
    } catch {
      return defaultCurrency;
    }
  };

  const [currency, setCurrencyState] = useState<CurrencyInfo>(() => {
    // Try to get the currency from localStorage (only on client side)
    if (typeof window !== 'undefined') {
      const savedCurrency = localStorage.getItem('selectedCurrency');
      if (savedCurrency) {
        try {
          const parsed = JSON.parse(savedCurrency);
          // Find the currency in our list to get updated rates
          const current = currencies.find(c => c.code === parsed.code);
          return current || getLocalCurrency();
        } catch {
          return getLocalCurrency();
        }
      }
    }
    return getLocalCurrency();
  });

  // Update currency rate when exchange rates load
  useEffect(() => {
    if (!isLoading && exchangeRates) {
      setCurrencyState(prev => {
        // Keep the same currency but update the rate
        const updatedRate = prev.code === "USD" ? 1 : (exchangeRates[prev.code] || 1);
        return { ...prev, rate: updatedRate };
      });
    }
  }, [exchangeRates, isLoading]);

  const setCurrency = (newCurrency: CurrencyInfo) => {
    // Make sure we use the latest exchange rate
    const rate = newCurrency.code === "USD" 
      ? 1 
      : (exchangeRates && exchangeRates[newCurrency.code] 
          ? exchangeRates[newCurrency.code] 
          : newCurrency.rate);
    
    setCurrencyState({ ...newCurrency, rate });
    // Save to localStorage (only on client side)
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCurrency', JSON.stringify({ ...newCurrency, rate }));
      // Force a re-render of components that display prices
      window.dispatchEvent(new Event('currency-changed'));
    }
  };

  // Convert a price in USD cents to the selected currency
  const convertPrice = (priceInUSDCents: number): number => {
    const priceInUSD = priceInUSDCents / 100;
    const converted = priceInUSD * currency.rate;
    // Round to 2 decimal places for most currencies
    return Math.round(converted * 100);
  };

  // Format a price in the selected currency
  const formatPrice = (priceInUSDCents: number): string => {
    const converted = convertPrice(priceInUSDCents);
    // Format nicely with the proper currency symbol
    return `${currency.symbol}${(converted / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const value = {
    currency,
    setCurrency,
    convertPrice,
    formatPrice,
    currencies,
    isLoading
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

// Custom hook to use the currency context
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

interface CurrencySelectorProps {
  className?: string;
}

export function CurrencySelector({ className }: CurrencySelectorProps) {
  const { currency, setCurrency, currencies, isLoading } = useCurrency();
  const { toast } = useToast();

  const handleCurrencyChange = (value: string) => {
    const newCurrency = currencies.find(c => c.code === value);
    if (newCurrency) {
      setCurrency(newCurrency);
      toast({
        title: "Currency changed",
        description: `Prices will now be displayed in ${newCurrency.name} (${newCurrency.code})`,
      });
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currency.code}
        onValueChange={handleCurrencyChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent>
          {currencies.map(c => (
            <SelectItem key={c.code} value={c.code}>
              {c.symbol} {c.code} - {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}