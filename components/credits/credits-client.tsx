'use client';

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import CreditBundles from "@/components/credit-bundles";
import ActivityTable from "@/components/activity-table";
import ApiUsageChart from "@/components/api-usage-chart";
import { formatNumber } from "@/lib/utils";

function CreditsContent() {
  const { user, refetchUser } = useAuth(); // Assuming useAuth exposes a refetch function
  const search = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  // This effect handles the success/cancel redirects from Stripe Checkout.
  useEffect(() => {
    const success = search.get('success');
    if (success === '1') {
      toast({ title: "Purchase complete!", description: "Your credits will update shortly." });
      
      // Force a refresh of the user's data to update the credit balance display
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      if (refetchUser) refetchUser();

      // Clean up the URL by removing the query parameters
      router.replace('/credits', { scroll: false });
    }
    // ... (handle canceled)
  }, [search, toast, router, refetchUser]);
  
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Credits & Billing</h1>
        <p className="text-muted-foreground">Manage your credits, view history, and purchase more bundles.</p>
       </div>

       <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Available Credits</h3>
              <p className="text-4xl font-bold mt-1">
                {formatNumber(user?.credits || 0)}
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                Active
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="bundles">
        <TabsList>
          <TabsTrigger value="bundles">Purchase Credits</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="bundles"><CreditBundles /></TabsContent>
        <TabsContent value="history"><ActivityTable /></TabsContent>
        <TabsContent value="usage"><ApiUsageChart /></TabsContent>
      </Tabs>
    </div>
  );
}

// ... (CreditsLoading component)

export function CreditsClient() {
  return (
    <Suspense>
      <CreditsContent />
    </Suspense>
  );
}