'use client';

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { User, Transaction as SharedTransaction } from "@/shared/schema";
import type { CreditBundle } from "@/components/credit-bundles";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreditBundles from "@/components/credit-bundles";
import ActivityTable from "@/components/activity-table";
import ApiUsageChart from "@/components/api-usage-chart";
import { useCurrency } from "@/components/CurrencyProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// 1. Define the props the component will receive from the server page
interface CreditsClientProps {
  initialUserData: User | null;
  initialTransactions: SharedTransaction[];
  initialBundles: CreditBundle[];
}


export function CreditsClient({ initialUserData, initialTransactions,initialBundles }: CreditsClientProps) {
  const [user, setUser] = useState(initialUserData);
  const [transactions, setTransactions] = useState(initialTransactions);
  const router = useRouter();
  const search = useSearchParams();
  const { toast } = useToast();
  const { currencies, selectedCurrency, setSelectedCurrency, isLoading: isCurrencyLoading } = useCurrency();

  useEffect(() => {
     const success = search.get('success');
      if (success === '1') {
        toast({ title: "Purchase complete!", description: "Updating your credit balance..." });
        router.refresh(); // This re-fetches the server props
        router.replace('/credits', { scroll: false });
      }
  }, [search, router, toast]);

  const { apiRequests, creditsUsed } = useMemo(() => {
    const safeTransactions = Array.isArray(transactions) ? transactions : [];

  // Use the correct transaction type from your enum
    const usageTransactions = safeTransactions.filter(tx => tx?.type === "api_usage");
    
    const apiRequests = usageTransactions.length;
    // For usage, sum the 'credits' column, not the monetary amount
    const creditsUsed = usageTransactions.reduce((sum, tx) => sum + Math.abs(tx?.credits || 0), 0);

    return { apiRequests, creditsUsed };
  }, [transactions]);

  const activityTransactions = useMemo(() => {
    const safe = Array.isArray(transactions) ? transactions : [];
    return safe.map((tx) => ({
      id: tx.id,
      type: tx.type === "credits_purchase" ? "credit_purchase" : tx.type === "subscription" ? "adjustment" : tx.type,
      amount: typeof (tx as any).amount === "number" ? (tx as any).amount : 0,
      credits: tx.credits,
      description: (tx as any).description ?? "",
      status: tx.status,
      payment_method: (tx as any).paymentMethod ?? "N/A",
      createdAt: tx.createdAt,
    })) as any[];
  }, [transactions]);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Credits & Billing</h1>
          <p className="text-muted-foreground">Manage your credits, view history, and purchase more bundles.</p>
          
          {/* The Currency Switcher */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Display prices in: </span>
            <div className="w-48">
              <Select 
                value={selectedCurrency} 
                onValueChange={setSelectedCurrency}
                disabled={isCurrencyLoading || !currencies.length}
              >
                <SelectTrigger aria-label="Select your currency">
                  <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))} 
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Available Credits</h3>
                <p className="text-4xl font-bold mt-1">
                  {new Intl.NumberFormat().format(Number(user?.credits ?? 0))}
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="bundles">
          <TabsList>
            <TabsTrigger value="bundles">Purchase Credits</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
            <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          </TabsList>
          {/* 👇 2. Pass the initialBundles prop down to the CreditBundles component */}
          <TabsContent value="bundles"><CreditBundles bundles={initialBundles} /></TabsContent>
          <TabsContent value="history"><ActivityTable transactions={activityTransactions} /></TabsContent>
          <TabsContent value="usage"><ApiUsageChart /></TabsContent>
        </Tabs>
      </div>
    );
  }