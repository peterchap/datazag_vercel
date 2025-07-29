import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, CreditCard, AlertTriangle } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useCredits } from "@/hooks/use-credits";
import { useCurrency } from "@/components/currency-selector";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CreditPurchasePayPalButton from "@/components/CreditPurchasePayPalButton";
import { queryClient } from "@/lib/queryClient";

interface CreditBundlesProps {
  className?: string;
}

export default function CreditBundles({ className }: CreditBundlesProps) {
  const { bundles, isBundlesLoading, initiatePayment, isInitiatingPayment } = useCredits();
  const { formatPrice, currency } = useCurrency();
  const { user } = useAuth();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("stripe");
  const [selectedBundleId, setSelectedBundleId] = useState<number | null>(null);
  
  // Check if the user has been restricted from purchasing credits
  const canPurchaseCredits = user?.canPurchaseCredits !== false;
  
  const handlePurchaseClick = (bundleId: number) => {
    if (!canPurchaseCredits) {
      return; // Don't proceed if purchases are restricted
    }
    
    if (selectedPaymentMethod === "stripe") {
      initiatePayment({ bundleId });
    } else {
      setSelectedBundleId(bundleId);
    }
  };
  
  return (
    <Card className={className}>
      <CardHeader className="border-b border-gray-200">
        <CardTitle>Credit Bundles</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {!canPurchaseCredits && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Credit purchases have been disabled for your account. Please contact your administrator.
            </AlertDescription>
          </Alert>
        )}
      
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Payment Method</label>
          <Tabs defaultValue="stripe" value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="stripe" disabled={!canPurchaseCredits}>
                <CreditCard className="w-4 h-4 mr-2" />
                Credit Card
              </TabsTrigger>
              <TabsTrigger value="paypal" disabled={!canPurchaseCredits}>
                <svg className="w-4 h-4 mr-2 inline" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.291-.077.448-.983 5.385-4.217 6.86-8.293 6.86H8.575l-.882 6.514a1.296 1.296 0 0 1-1.28 1.119 1.09 1.09 0 0 1-.337-.034zm.877-12.054c.164-1.062.353-2.266.498-3.327.08-.582.535-.991 1.1-.991h3.816c1.33 0 2.478.278 3.227.868.662.516.971 1.315.873 2.322-.38 4.04-2.17 4.922-5.024 4.922H9.322c-.08 0-.15.015-.224.005-.38-.05-.76.147-.88.538z"/>
                </svg>
                PayPal
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {isBundlesLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : bundles.length === 0 ? (
          <div className="h-40 flex items-center justify-center">
            <p className="text-gray-500">No credit bundles available</p>
          </div>
        ) : (
          bundles.map((bundle) => (
            <div
              key={bundle.id}
              className="relative border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
            >
              {bundle.popular && (
                <div className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                  Popular
                </div>
              )}
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-base font-medium text-gray-900">{bundle.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{bundle.description}</p>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {formatPrice(bundle.price / 100)}
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <Coins className="text-amber-500 mr-1 h-4 w-4" />
                <span>{formatNumber(bundle.credits)} credits</span>
              </div>
              
              {selectedPaymentMethod === "stripe" ? (
                <Button
                  className="mt-4 w-full"
                  onClick={() => handlePurchaseClick(bundle.id)}
                  disabled={isInitiatingPayment || !canPurchaseCredits}
                >
                  {isInitiatingPayment ? "Processing..." : "Purchase with Credit Card"}
                </Button>
              ) : (
                <div className="mt-4">
                  {selectedBundleId === bundle.id ? (
                    <div className="mt-4">
                      <div 
                        id="paypal-button-container" 
                        className="paypal-button-container"
                      >
                        <CreditPurchasePayPalButton
                          amount={(bundle.price / 100).toString()}
                          currency={currency.code}
                          bundleId={bundle.id}
                          credits={bundle.credits}
                          onSuccess={() => {
                            setSelectedBundleId(null);
                            // Refresh credit data on the page
                            queryClient.invalidateQueries({ queryKey: ["/api/me"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
                          }}
                          onError={() => setSelectedBundleId(null)}
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2 w-full"
                        onClick={() => setSelectedBundleId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handlePurchaseClick(bundle.id)}
                      disabled={!canPurchaseCredits}
                    >
                      Purchase with PayPal
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
