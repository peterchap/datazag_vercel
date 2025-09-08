import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAutoFetch } from "@/hooks/use-auto-fetch";
import { useCurrency } from "@/components/currency-selector";
import type { CreditBundle } from "@/components/credit-bundles"; // Assuming you export this type
import type { Transaction } from "@/shared/schema"; // Assuming a shared transaction type


interface CreditBundle {
  id: number;
  name: string;
  description: string;
  credits: number;
  price: number;
  popular: boolean;
}

interface Transaction {
  id: number;
  userId: number;
  type: string;
  amount: number;
  description: string;
  apiKeyId: number | null;
  status: string;
  metadata: any;
  createdAt: string;
}

export function useCredits() {
  const { toast } = useToast();
  const { currency } = useCurrency();
  
  // Get credit bundles and expose its refetch function
  const {
    data: bundles = [],
    loading: isBundlesLoading,
    error: bundlesError,
    refetch: refetchBundles, // <-- Expose the refetch function
  } = useAutoFetch<CreditBundle[]>("/api/credit-bundles", { initialData: [] });
  
  // Get recent transactions and expose its refetch function
  const {
    data: transactions = [],
    loading: isTransactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions, // <-- Expose the refetch function
  } = useAutoFetch<Transaction[]>("/api/transactions", { initialData: [] });

  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);

  const initiatePayment = async ({ bundleId }: { bundleId: number }) => {
    try {
      setIsInitiatingPayment(true);

      const bundle = bundles.find(b => b.id === bundleId);
      if (!bundle) {
        throw new Error("Selected bundle not found.");
      }

      const basePriceInUsdCents = bundle.price;
      const conversionRate = currency.rate;
      const convertedAmountInCents = Math.round((basePriceInUsdCents / 100) * conversionRate * 100);
      

      const payload: {
        bundleId: number;
        currency: string;
        amount: number;
      } = { 
        bundleId,
        currency: currency.code,
        amount: convertedAmountInCents,
      };

      const res = await apiRequest("POST", "/api/stripe/checkout-credits", payload);
      const data = await res.json();

      if (data.freeClaim) {
        toast({
          title: "Success!",
          description: data.message || "Your free credits have been added.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        refetchTransactions(); // Refresh the transactions list
        return;
      }
      
      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      
      throw new Error(data?.error || "Unable to start checkout");
    } catch (error: any) {
      toast({
        title: "Payment Initiation Failed",
        description: error.message || "Unable to initiate payment.",
        variant: "destructive",
      });
    } finally {
      setIsInitiatingPayment(false);
    }
  };
  
  return {
    bundles: Array.isArray(bundles) ? bundles : [],
    transactions,
    isBundlesLoading,
    isTransactionsLoading,
    bundlesError,
    transactionsError,
    initiatePayment,
    isInitiatingPayment,
  };
}
