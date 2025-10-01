'use client';

import { useState } from "react";
import { useCurrency } from "@/components/CurrencyProvider";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/utils";



// This interface defines the shape of a credit bundle object
export interface CreditBundle {
  id: number;
  name: string;
  description: string;
  credits: number;
  price_in_usd_cents: number; // Price is assumed to be in USD cents
  popular: boolean;
}

interface CreditBundlesProps {
  bundles: CreditBundle[];
}

// You can keep your copy overrides to customize display without changing the DB
const BUNDLE_COPY_OVERRIDES: Record<string, { name?: string; description?: string; features?: string[] }> = {
  starter: { name: "Starter", description: "Perfect for testing and small projects.", features: [ "API Access", "Decision Flag", "Email Support"] },
  pro: { name: "Pro", description: "For professionals and growing teams.", features: ["API Access", "Decision & Reason Flags", "Email Support"] },
  business: { name: "Business", description: "For growing teams and production use.", features: ["API Access", "Decision & Reason Flags", "Priority Email Support"] },
  enterprise: { name: "Enterprise", description: "Scale with governance and support.", features: ["API Access", "Decision & Reason Flags","DNS Records","Dedicated Support"] },
};

const classifyOverrideKey = (name: string): string => {
  const n = (name || "").toLowerCase();
  if (n.includes("enterprise")) return "enterprise";
  if (n.includes("business")) return "business";
  if (n.includes("starter")) return "starter";
  return n;
};

export default function CreditBundles({ bundles }: CreditBundlesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatPrice, selectedCurrency, isLoading: isCurrencyLoading } = useCurrency();
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  
  const canPurchaseCredits = user?.canPurchaseCredits !== false;

  // 👇 3. The payment logic is now inside the component to manage state
  const handlePurchaseClick = async (bundle: CreditBundle) => {
    if (!canPurchaseCredits) return;
    setIsInitiatingPayment(true);
    
    try {
      const payload = { 
        bundleId: bundle.id,
        currency: selectedCurrency,
      };

      const res = await fetch("/api/stripe/checkout-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout session.");
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Could not get checkout URL.");
      }
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsInitiatingPayment(false);
    }
  };

   // 👇 Check both your data loading and currency loading states
  if (isCurrencyLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {bundles.map((bundle) => {
        const override = BUNDLE_COPY_OVERRIDES[classifyOverrideKey(bundle.name)] || {};
        const isFree = bundle.price_in_usd_cents === 0;

        return (
          <Card key={bundle.id} className={`relative flex flex-col ${bundle.popular ? 'border-primary' : ''}`}>
            {bundle.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>}
            <CardHeader>
              <CardTitle className="text-center">{override.name || bundle.name}</CardTitle>
              <CardDescription className="text-center min-h-[40px]">{override.description || bundle.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              <div className="text-3xl text-center font-bold">
                {isFree ? "Free" : formatPrice(bundle.price_in_usd_cents)}
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
                {isInitiatingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isInitiatingPayment ? "Processing..." : (isFree ? "Claim Free Credits" : "Purchase")}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}