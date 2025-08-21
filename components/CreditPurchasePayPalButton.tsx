import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PayPalButton from "./PayPalButton";

interface CreditPurchasePayPalButtonProps {
  bundleId: number;
  amount: string; // The price in string format (e.g., "19.99")
  credits: number; // Number of credits in the bundle
  currency: string; // Currency code (e.g., "USD")
  discountCode?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function CreditPurchasePayPalButton({
  bundleId,
  amount,
  credits,
  currency,
  discountCode,
  onSuccess,
  onError
}: CreditPurchasePayPalButtonProps) {
  const { toast } = useToast();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  
  // Override the createOrder function in PayPalButton
  // This allows us to use our secured endpoint that checks purchase permissions
  useEffect(() => {
    const originalCreateOrder = (window as any).paypalCreateOrder;
    
    (window as any).paypalCreateOrder = async () => {
      setIsCreatingOrder(true);
      
      try {
        // Call our secured endpoint
        const response = await apiRequest("POST", "/api/paypal/create-order", {
          bundleId,
          discountCode,
          currency,
          intent: "CAPTURE"
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create order");
        }
        
        const data = await response.json();
        setOrderData(data);
        return { orderId: data.id };
      } catch (error: any) {
        console.error("PayPal order creation error:", error);
        toast({
          title: "Payment Error",
          description: error.message || "Could not process your payment. Please try again.",
          variant: "destructive",
        });
        
        if (onError) {
          onError(error);
        }
        
        throw error;
      } finally {
        setIsCreatingOrder(false);
      }
    };
    
    return () => {
      // Restore original function
      (window as any).paypalCreateOrder = originalCreateOrder;
    };
  }, [bundleId, discountCode, currency, toast, onError]);

  // Monkey patch the PayPal onApprove handler to emit a success event our component listens for
  useEffect(() => {
    const originalOnApprove = (window as any).paypalOnApprove;
    (window as any).paypalOnApprove = async (data: any) => {
      if (typeof originalOnApprove === 'function') {
        try { await originalOnApprove(data); } catch (_) {}
      }
      // Dispatch event for listeners in this component to update credits/transactions
      window.dispatchEvent(new CustomEvent('paypal:payment:success', { detail: data }));
    };
    return () => {
      (window as any).paypalOnApprove = originalOnApprove;
    };
  }, []);
  
  // Handle successful payments
  useEffect(() => {
    const handlePayPalSuccess = async (event: any) => {
      if (!event.detail || !event.detail.orderId) return;
      
      try {
        // Wait a moment to ensure the server has processed the payment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Refresh data
        await queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        
        toast({
          title: "Purchase Successful",
          description: `${credits} credits have been added to your account.`,
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } catch (error: any) {
        console.error("Error handling PayPal success:", error);
      }
    };
    
    window.addEventListener("paypal:payment:success", handlePayPalSuccess);
    
    return () => {
      window.removeEventListener("paypal:payment:success", handlePayPalSuccess);
    };
  }, [credits, onSuccess, toast]);
  
  return (
    <div className="w-full relative">
      {isCreatingOrder && (
        <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10 rounded-md">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      <PayPalButton
        amount={amount}
        currency={currency}
        intent="CAPTURE"
      />
    </div>
  );
}