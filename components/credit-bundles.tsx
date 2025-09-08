'use client';

import { useState } from "react";
import { useCredits } from "@/hooks/use-credits";
import { useCurrency } from "@/components/currency-selector"; // 1. Import the new hook
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Coins, CreditCard, AlertTriangle, CheckCircle } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// This interface defines the shape of a credit bundle object
interface CreditBundle {
  id: number;
  name: string;
  description: string;
  credits: number;
  price: number; // Price is assumed to be in USD cents
  popular: boolean;
}

// You can keep your copy overrides to customize display without changing the DB
const BUNDLE_COPY_OVERRIDES: Record<string, { name?: string; description?: string; features?: string[] }> = {
  starter: { name: "Starter", description: "Perfect for testing and small projects.", features: ["1,000 Credits", "Basic API Access"] },
  business: { name: "Business", description: "For growing teams and production use.", features: ["10,000 Credits", "Standard API Access", "Email Support"] },
  enterprise: { name: "Enterprise", description: "Scale with governance and support.", features: ["100,000 Credits", "Full API Access", "Dedicated Support"] },
};

const classifyOverrideKey = (name: string): string => {
  const n = (name || "").toLowerCase();
  if (n.includes("enterprise")) return "enterprise";
  if (n.includes("business")) return "business";
  if (n.includes("starter")) return "starter";
  return n;
};

export default function CreditBundles() {
  const { user } = useAuth();
  const { bundles, isBundlesLoading, initiatePayment, isInitiatingPayment } = useCredits();
  const { formatPrice } = useCurrency(); // 2. Get the smart formatter from the context
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("stripe");
  
  const canPurchaseCredits = user?.canPurchaseCredits !== false;

  const handlePurchaseClick = (bundle: CreditBundle) => {
    if (!canPurchaseCredits) return;
    initiatePayment({ bundleId: bundle.id });
  };
  
  return (
    <div className="space-y-6">
       {!canPurchaseCredits && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Purchases Disabled</AlertTitle>
          <AlertDescription>
            Credit purchases have been disabled for your account. Please contact your administrator.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Method</label>
        <Tabs defaultValue="stripe" onValueChange={setSelectedPaymentMethod}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stripe" disabled={!canPurchaseCredits}><CreditCard className="w-4 h-4 mr-2" />Credit Card</TabsTrigger>
            <TabsTrigger value="paypal" disabled={true}>PayPal (Coming Soon)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {isBundlesLoading ? (
        <div className="flex justify-center items-center h-40"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {bundles.map((bundle) => {
            const override = BUNDLE_COPY_OVERRIDES[classifyOverrideKey(bundle.name)] || {};
            const isFree = bundle.price === 0;

            return (
              <Card key={bundle.id} className={`relative flex flex-col ${bundle.popular ? 'border-primary' : ''}`}>
                {bundle.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">Most Popular</Badge>}
                <CardHeader className="min-h-[110px]">
                  <CardTitle className="text-center">{override.name || bundle.name}</CardTitle>
                  <CardDescription className="text-center min-h-[70px]">{override.description || bundle.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-6">
                  <div className="text-3xl text-center font-bold">
                    {/* 3. This now uses the dynamic formatPrice function from the context */}
                    {isFree ? "Free" : formatPrice(bundle.price)}
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center"><Coins className="mr-2 h-4 w-4 text-primary" />{formatNumber(bundle.credits)} Credits</li>
                    {override.features?.map((feature, i) => (
                       <li key={i} className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-green-500" />{feature}</li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Button
                    className="w-full"
                    onClick={() => handlePurchaseClick(bundle)}
                    disabled={isInitiatingPayment || !canPurchaseCredits}
                    variant={bundle.popular ? 'default' : 'outline'}
                  >
                    {isInitiatingPayment ? "Processing..." : (isFree ? "Claim Free Credits" : "Purchase")}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}