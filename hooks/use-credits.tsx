import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAutoFetch } from "@/hooks/use-auto-fetch";

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
  const router = useRouter();
  
  // Get credit bundles
  const {
    data: bundles = [],
    loading: isBundlesLoading,
    error: bundlesError,
  } = useAutoFetch<CreditBundle[]>("/api/credit-bundles", { initialData: [] });
  
  // Get recent transactions
  const {
    data: transactions = [],
    loading: isTransactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useAutoFetch<Transaction[]>("/api/transactions", { initialData: [] });
  
  // Validate discount code
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [discountValidationResult, setDiscountValidationResult] = useState<any>(null);
  const [discountValidationError, setDiscountValidationError] = useState<any>(null);
  const validateDiscount = async ({ code, amount }: { code: string; amount: number }) => {
    try {
      setIsValidatingDiscount(true);
      setDiscountValidationError(null);
      const res = await apiRequest("POST", "/api/validate-discount", { code, amount });
      const json = await res.json();
      setDiscountValidationResult(json);
      return json;
    } catch (e) {
      setDiscountValidationError(e);
      throw e;
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  // Initiate payment for a credit bundle
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const initiatePayment = async ({ bundleId, discountCode, selectedCurrency, convertedPrice }: { bundleId: number; discountCode?: string; selectedCurrency?: string; convertedPrice?: number }) => {
    try {
      setIsInitiatingPayment(true);
      // Call server to create a Stripe Checkout Session for the selected bundle
      const res = await apiRequest("POST", "/api/stripe/checkout-credits", { bundleId, discountCode, selectedCurrency, convertedPrice });
      const data = await res.json();
      // Diagnostics: log unitAmount/rawPrice/normalizedDollars if present
      try {
        // eslint-disable-next-line no-console
        console.log("Stripe checkout response diagnostics", {
          unitAmount: (data as any)?.unitAmount,
          rawPrice: (data as any)?.rawPrice,
          normalizedDollars: (data as any)?.normalizedDollars,
        });
        if ((data as any)?.unitAmount !== undefined && (data as any).unitAmount < 1000) {
          // Warn locally if the computed amount looks too small (e.g., $0.xx)
          // eslint-disable-next-line no-console
          console.warn("Warning: unitAmount looks too small for expected dollars pricing", (data as any).unitAmount);
        }
      } catch {}
      if (res.ok && data?.url) {
        const debugNoRedirect = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_STRIPE_DEBUG) === 'true';
        const delayMsRaw = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_DELAY_STRIPE_REDIRECT_MS) as any;
        const delayMs = Number(delayMsRaw) > 0 ? Number(delayMsRaw) : 0;
        if (debugNoRedirect) {
          // Open in a new tab to keep this page's console visible
          try { window.open(data.url, '_blank', 'noopener,noreferrer'); } catch {}
          return;
        }
        if (delayMs > 0) {
          setTimeout(() => { window.location.href = data.url; }, delayMs);
          return;
        }
        window.location.href = data.url;
        return;
      }
      throw new Error(data?.error || "Unable to start checkout");
    } catch (error: any) {
      toast({
        title: "Payment Initiation Failed",
        description: error.message || "Unable to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInitiatingPayment(false);
    }
  };
  
  // Complete payment after successful Stripe transaction
  const [isCompletingPayment, setIsCompletingPayment] = useState(false);
  const completePayment = async (paymentIntentId: string) => {
    try {
      setIsCompletingPayment(true);
      const res = await apiRequest("POST", "/api/payment-success", { paymentIntentId });
      const data = await res.json();
      // Trigger auth context refresh for immediate UI update
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshUserData'));
      }, 500);
      // Notify the user about the successful payment
      toast({
        title: "Payment Successful!",
        description: `${data.creditsAdded} credits added to your account. New total: ${data.newTotal}`,
      });
      // Refresh transactions list
      await refetchTransactions();
      // Navigate to credits page to show updated balance
      setTimeout(() => {
        router.push("/credits");
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Payment Processing Failed",
        description: error.message || "Unable to process payment. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsCompletingPayment(false);
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
  completePayment,
  isCompletingPayment,
  validateDiscount,
  isValidatingDiscount,
  discountValidationResult,
  discountValidationError,
  };
}
