import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAutoFetch } from "@/hooks/use-auto-fetch";
import { useCurrency } from "@/components/currency-selector";
import type { CreditBundle } from "@/components/credit-bundles"; // Assuming you export this type
import type { Transaction } from "@/shared/schema"; // Assuming a shared transaction type


export function useCredits() {
  const { toast } = useToast();
  
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

  const initiatePayment = async ({ bundleId, currency }: { bundleId: number; currency: string; }) => {
  setIsInitiatingPayment(true);
  try {
    // 1. The payload is now much simpler.
    // We ONLY send the bundle ID and the target currency.
    // The server will look up the price and do the conversion safely.
    const payload = { 
      bundleId,
      currency,
    };

    // 2. The apiRequest remains the same, but sends the simplified payload.
    const res = await apiRequest("POST", "/api/stripe/checkout-credits", payload);
    const data = await res.json();

    if (res.ok && data?.url) {
      window.location.href = data.url; // Redirect to Stripe
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
