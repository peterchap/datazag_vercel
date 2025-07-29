import { useEffect, useState } from "react";
import PayPalButton from "./PayPalButton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PayPalButtonWrapperProps {
  amount: string;
  currency: string;
  bundleId: number;
  onSuccess?: () => void;
}

export default function PayPalButtonWrapper({
  amount,
  currency,
  bundleId,
  onSuccess
}: PayPalButtonWrapperProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Add a global event listener for PayPal successful payments
  useEffect(() => {
    const handlePayPalSuccess = async (event: any) => {
      if (!event.detail || !event.detail.orderId) return;
      
      setIsProcessing(true);
      
      try {
        // Call our server endpoint to process the payment
        const response = await apiRequest("POST", "/api/paypal-payment-success", {
          orderID: event.detail.orderId,
          bundleId: bundleId
        });
        
        const data = await response.json();
        
        if (data.success) {
          toast({
            title: "Credits Added",
            description: `${data.added} credits have been added to your account.`,
          });
          
          // Invalidate relevant queries to update UI
          queryClient.invalidateQueries({ queryKey: ["/api/me"] });
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
          
          if (onSuccess) {
            onSuccess();
          }
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to process payment.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };
    
    // Add PayPal success event listener
    window.addEventListener("paypal:payment:success", handlePayPalSuccess);
    
    return () => {
      // Clean up event listener
      window.removeEventListener("paypal:payment:success", handlePayPalSuccess);
    };
  }, [bundleId, onSuccess, toast]);
  
  // Monkey patch the PayPal onApprove handler
  useEffect(() => {
    // The original PayPal onApprove function
    const originalOnApprove = (window as any).paypalOnApprove;
    
    // Override to include our custom handler
    (window as any).paypalOnApprove = async (data: any) => {
      // Call original handler if it exists
      if (originalOnApprove) {
        await originalOnApprove(data);
      }
      
      // Dispatch our custom event
      window.dispatchEvent(
        new CustomEvent("paypal:payment:success", { detail: data })
      );
    };
    
    return () => {
      // Restore original handler
      (window as any).paypalOnApprove = originalOnApprove;
    };
  }, []);
  
  return (
    <PayPalButton
      amount={amount}
      currency={currency}
      intent="CAPTURE"
    />
  );
}