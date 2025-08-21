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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/components/currency-selector";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CreditPurchasePayPalButton from "@/components/CreditPurchasePayPalButton";
import { queryClient } from "@/lib/queryClient";
import Link from "next/link";

interface CreditBundlesProps {
  className?: string;
}

// Inline copy overrides so you can align Starter/Pro/Enterprise names & descriptions
// with your pricing page without changing database rows.
type BundleOverride = {
  name?: string;
  description?: string;
  badge?: string;
  features?: string[];
};

const BUNDLE_COPY_OVERRIDES: Record<string, BundleOverride> = {
  // Keys are normalized bundle names: lowercased with spaces removed
  // Edit the strings below to match your pricing page copy.
  starter: {
    name: "Starter",
    description: "Perfect for non-commercial projects and testing",
    features: [
      "Renewable for 3 months",
      "Overall Risk Assessment",
      "Great for prototypes and personal projects",
    ],
  },
  pro: {
    name: "Pro",
    description: "Starter plan for growing businesses.",
    features: [
      "Auto-renewal",
      "Overall Risk Assessment",
      "Team-ready",
    ],
  },
  business: {
    name: "Business",
    description: "Advanced capacity for growing teams.",
    badge: "Most popular",
    features: [
      "Auto Renewal",
      "Overall risk assessment",
      "Phishing & Malware flags",
      "Team-ready",
    ],
  },
  enterprise: {
    name: "Enterprise",
    description: "Scale with governance, support, and uptime SLAs.",
    features: [
      "Dedicated support & SLA",
      "Invoice/purchase order payments",
      "Volume pricing",
    ],
  },
};

// Fuzzy map a bundle name to an override key (handles names like "Starter Plan", "Pro Package")
function classifyOverrideKey(name: string): string {
  // Normalize and make matching resilient to punctuation and synonyms
  const raw = (name || "").toLowerCase();
  const n = raw.replace(/[^a-z0-9]+/g, " ").trim();

  // Enterprise
  if (n.includes("enterprise")) return "enterprise";

  // Business and common synonyms
  if (n.includes("business") || n.includes("team") || n.includes("growth") || n.includes("company")) {
    return "business";
  }

  // Starter and common synonyms
  if (n.includes("starter") || n.includes("basic") || n.includes("start")) {
    return "starter";
  }

  // Pro and common synonyms
  if (n.includes("pro") || n.includes("professional")) {
    return "pro";
  }

  // fallback to normalized (spaces removed) for any custom key entries in overrides
  return n.replace(/\s+/g, "");
}

// Some databases/clients may serialize booleans differently (true/1/'t'/'true').
function isTrueish(value: unknown): boolean {
  if (value === true) return true;
  if (value === 1) return true;
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (v === "t" || v === "true" || v === "1") return true;
  }
  return false;
}

export default function CreditBundles({ className }: CreditBundlesProps) {
  // DB now stores prices in whole dollars (e.g., 79, 499, 999). Convert to cents for formatting.
  const toCents = (dollars: number | null | undefined) => {
    const v = Number(dollars || 0);
    return Math.round(v * 100);
  };
  const paypalEnabled = process.env.NEXT_PUBLIC_PAYPAL_ENABLED === "true";
  const { bundles, isBundlesLoading, initiatePayment, isInitiatingPayment } = useCredits();
  const { formatPrice, currency, convertPrice } = useCurrency();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("stripe");
  const [selectedBundleId, setSelectedBundleId] = useState<number | null>(null);
  const [apiKeyBanner, setApiKeyBanner] = useState<{ key: string } | null>(null);
  const [revealKey, setRevealKey] = useState(false);
  const [freePlanAlreadyActiveBanner, setFreePlanAlreadyActiveBanner] = useState(false);

  const maskKey = (k: string) => {
    if (!k) return "";
    if (k.length <= 10) return k;
    return `${k.slice(0, 8)}…${k.slice(-6)}`;
  };
  
  // Check if the user has been restricted from purchasing credits
  // Only authorized staff (admins or users with explicit permission) can purchase credits
  const canPurchaseCredits = user?.canPurchaseCredits !== false && 
    (user?.role === "admin" || user?.canPurchaseCredits === true);
  
  const handlePurchaseClick = (bundleId: number) => {
    if (!canPurchaseCredits) {
      return; // Don't proceed if purchases are restricted
    }
    // Get selected currency and converted price (in cents)
    const bundle = bundles.find(b => b.id === bundleId);
    const convertedPrice = bundle ? convertPrice(toCents(bundle.price)) / 100 : 0;
    if (selectedPaymentMethod === "stripe") {
      initiatePayment({
        bundleId,
        selectedCurrency: currency.code,
        convertedPrice
      });
    } else {
      setSelectedBundleId(bundleId);
    }
  };
  
  return (
    <Card className={className}>
      <CardHeader className="border-b border-gray-200">
        <CardTitle>Credit Bundles</CardTitle>
      </CardHeader>
            <CardContent className="p-6">
        {apiKeyBanner && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-800">
              Free plan activated. We've created your API key:
              <span className="ml-1 font-mono text-green-900 bg-white/60 rounded px-1 py-0.5">
                {revealKey ? apiKeyBanner.key : maskKey(apiKeyBanner.key)}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setRevealKey((v) => !v)}
              >
                {revealKey ? "Hide" : "Reveal"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(apiKeyBanner.key);
                    toast({ title: "Copied", description: "API key copied to clipboard" });
                  } catch (e: any) {
                    toast({ title: "Copy failed", description: e?.message || "Could not copy API key", variant: "destructive" });
                  }
                }}
              >
                Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setApiKeyBanner(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
        {freePlanAlreadyActiveBanner && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              Your Free plan is already active. You can view your credits and manage API keys on the
              <Link href="/api-keys" className="ml-1 underline font-medium text-blue-900">API Keys</Link>
              {" "}page.
            </p>
            <div className="mt-2">
              <Button size="sm" variant="ghost" onClick={() => setFreePlanAlreadyActiveBanner(false)}>Dismiss</Button>
            </div>
          </div>
        )}
        {!canPurchaseCredits && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> You don't have permission to purchase credits. 
              Please contact your account administrator or company admin to make purchases.
            </p>
          </div>
        )}
        
        {/* Payment Method Selection */}
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
            {paypalEnabled ? (
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
            ) : (
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="stripe" disabled={!canPurchaseCredits}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Credit Card
                </TabsTrigger>
                <TabsTrigger value="paypal" disabled>
                  <svg className="w-4 h-4 mr-2 inline" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.291-.077.448-.983 5.385-4.217 6.86-8.293 6.86H8.575l-.882 6.514a1.296 1.296 0 0 1-1.28 1.119 1.09 1.09 0 0 1-.337-.034zm.877-12.054c.164-1.062.353-2.266.498-3.327.08-.582.535-.991 1.1-.991h3.816c1.33 0 2.478.278 3.227.868.662.516.971 1.315.873 2.322-.38 4.04-2.17 4.922-5.024 4.922H9.322c-.08 0 -.15.015-.224.005-.38-.05-.76.147-.88.538z"/>
                  </svg>
                  PayPal (Coming soon)
                </TabsTrigger>
              </TabsList>
            )}
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
              {(() => {
                const key = classifyOverrideKey(bundle.name || "");
                const o = BUNDLE_COPY_OVERRIDES[key];
                const badgeText = o?.badge || (isTrueish((bundle as any).popular) ? "Most popular" : undefined);
                return badgeText ? (
                  <div className="absolute top-2 right-2 z-10 bg-primary-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                    {badgeText}
                  </div>
                ) : null;
              })()}
              <div className="flex justify-between items-center">
                <div>
                  {(() => {
                    const key = classifyOverrideKey(bundle.name || "");
                    const o = BUNDLE_COPY_OVERRIDES[key];
                    const displayName = o?.name ?? bundle.name;
                    const displayDesc = o?.description ?? bundle.description;
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-medium text-gray-900">{displayName}</h4>
                          {(() => {
                            const key2 = classifyOverrideKey(bundle.name || "");
                            const o2 = BUNDLE_COPY_OVERRIDES[key2];
                            const inlineBadge = o2?.badge || (isTrueish((bundle as any).popular) ? "Most popular" : undefined);
                            return inlineBadge ? (
                              <span className="inline-flex items-center rounded-full bg-primary-50 text-primary-700 text-[10px] font-semibold px-2 py-0.5 border border-primary-200">
                                {inlineBadge}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        {displayDesc && (
                          <p className="text-sm text-gray-500 mt-1">{displayDesc}</p>
                        )}
                        {o?.features?.length ? (
                          <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
                            {o.features.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {formatPrice(toCents(bundle.price))}
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <Coins className="text-amber-500 mr-1 h-4 w-4" />
                <span>{formatNumber(bundle.credits)} credits</span>
              </div>
              
              {(bundle.price ?? 0) <= 0 ? (
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  disabled={!canPurchaseCredits}
                  onClick={async () => {
                    try {
                      // Call local Next API proxy to handle auth/cookies/service-key
                      const res = await apiRequest('POST', '/api/claim-free-bundle', { bundleId: bundle.id, userId: user?.id });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data?.message || 'Failed to activate free plan');
                      toast({ title: 'Free plan activated', description: `${formatNumber(bundle.credits)} credits added.` });
                      if (data?.apiKey) {
                        setApiKeyBanner({ key: data.apiKey });
                        setRevealKey(false);
                      }
                      // Refresh data on the page
                      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
                    } catch (e: any) {
                      const msg = String(e?.message || '');
                      if (msg.includes('Free plan already activated') || msg.startsWith('409:')) {
                        // Treat idempotent activation as success-like UX
                        toast({ title: 'Free plan already active', description: 'Your account already has the free plan.' });
                        setFreePlanAlreadyActiveBanner(true);
                        // Refresh to reflect current credits/state
                        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
                      } else {
                        toast({ title: 'Activation failed', description: e.message || 'Try again later', variant: 'destructive' });
                      }
                    }
                  }}
                >
                  Activate Free Plan
                </Button>
              ) : (
                selectedPaymentMethod === "stripe" || !paypalEnabled ? (
                  <Button
                    className="mt-4 w-full"
                    onClick={() => handlePurchaseClick(bundle.id)}
                    disabled={isInitiatingPayment || !canPurchaseCredits}
                  >
                    {isInitiatingPayment ? "Processing..." : "Purchase with Credit Card"}
                  </Button>
                ) : (
                  paypalEnabled && (
                    <div className="mt-4">
                      {selectedBundleId === bundle.id ? (
                        <div className="mt-4">
                          <div 
                            id="paypal-button-container" 
                            className="paypal-button-container"
                          >
                            <CreditPurchasePayPalButton
                              amount={(bundle.price).toString()}
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
                  )
                )
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
