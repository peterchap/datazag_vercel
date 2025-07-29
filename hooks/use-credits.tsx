import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useRouter } from "next/navigation";

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
    isLoading: isBundlesLoading,
    error: bundlesError,
  } = useQuery<CreditBundle[]>({
    queryKey: ["/api/credit-bundles"],
  });
  
  // Get recent transactions
  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    error: transactionsError,
  } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  // Validate discount code
  const validateDiscountMutation = useMutation({
    mutationFn: async ({ code, amount }: { code: string; amount: number }) => {
      const res = await apiRequest("POST", "/api/validate-discount", { code, amount });
      return res.json();
    },
  });

  // Initiate payment for a credit bundle
  const initiatePaymentMutation = useMutation({
    mutationFn: async ({ bundleId, discountCode }: { bundleId: number; discountCode?: string }) => {
      const res = await apiRequest("POST", "/api/create-payment-intent", { bundleId, discountCode });
      return res.json();
    },
    onSuccess: (data, variables) => {
      router.push(`/checkout/${variables.bundleId}${variables.discountCode ? `?discount=${variables.discountCode}` : ''}`);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Initiation Failed",
        description: error.message || "Unable to initiate payment. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Complete payment after successful Stripe transaction
  const completePaymentMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      const res = await apiRequest("POST", "/api/payment-success", { paymentIntentId });
      return res.json();
    },
    onSuccess: (data) => {
      // Force refresh of user data and transactions
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.refetchQueries({ queryKey: ["/api/me"] });
      queryClient.refetchQueries({ queryKey: ["/api/transactions"] });
      
      // Also trigger auth context refresh for immediate UI update
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshUserData'));
      }, 500);
      
      // Notify the user about the successful payment
      toast({
        title: "Payment Successful!",
        description: `${data.creditsAdded} credits added to your account. New total: ${data.newTotal}`,
      });
      
      // Navigate to credits page to show updated balance
      setTimeout(() => {
        router.push("/credits");
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Processing Failed",
        description: error.message || "Unable to process payment. Please contact support.",
        variant: "destructive",
      });
    },
  });
  
  return {
    bundles: Array.isArray(bundles) ? bundles : [],
    transactions,
    isBundlesLoading,
    isTransactionsLoading,
    bundlesError,
    transactionsError,
    initiatePayment: initiatePaymentMutation.mutate,
    isInitiatingPayment: initiatePaymentMutation.isPending,
    completePayment: completePaymentMutation.mutate,
    isCompletingPayment: completePaymentMutation.isPending,
    validateDiscount: validateDiscountMutation.mutate,
    isValidatingDiscount: validateDiscountMutation.isPending,
    discountValidationResult: validateDiscountMutation.data,
    discountValidationError: validateDiscountMutation.error,
  };
}
