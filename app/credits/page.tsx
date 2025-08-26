'use client'

export const dynamic = 'force-dynamic'; // session dependent credits page

import { Suspense } from "react";
import Layout from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CreditBundles from "@/components/credit-bundles";
import ActivityTable from "@/components/activity-table";
import ApiUsageChart from "@/components/api-usage-chart";
import { formatNumber } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

function CreditsContent() {
  const { user } = useAuth();
  const search = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const success = search.get('success');
    const canceled = search.get('canceled');
    if (success === '1') {
      // Refresh balances and transactions after redirect from Stripe Checkout
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      // Notify auth listeners (useAuth) to force-refresh user profile
      try {
        window.dispatchEvent(new CustomEvent('refreshUserData'));
      } catch {}
      // Webhook latency safeguard: re-invalidate once after a short delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      }, 2000);
      toast({ title: "Purchase complete", description: "Your credits will update shortly." });
      // Remove query params from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('bundleId');
      window.history.replaceState({}, '', url.toString());
    } else if (canceled === '1') {
      toast({ title: "Checkout canceled", description: "You can try again anytime." });
      const url = new URL(window.location.href);
      url.searchParams.delete('canceled');
      window.history.replaceState({}, '', url.toString());
    }
  }, [search, toast]);
  
  return (
    <>
      <div className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Available Credits</h3>
                <p className="text-4xl font-bold text-gray-900 mt-1">
                  {formatNumber(user?.credits || 0)}
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="bundles">
        <TabsList className="mb-4">
          <TabsTrigger value="bundles">Credit Bundles</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bundles">
          <CreditBundles />
        </TabsContent>
        
        <TabsContent value="history">
          <ActivityTable />
        </TabsContent>
        
        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>API Usage Analytics</CardTitle>
              <CardDescription>
                View your API usage patterns and trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiUsageChart />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function CreditsLoading() {
  return (
    <div className="mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading credits...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Credits() {
  return (
    <Layout
      title="Credits"
      description="Manage your API credits and view your usage history"
    >
      <Suspense fallback={<CreditsLoading />}>
        <CreditsContent />
      </Suspense>
    </Layout>
  );
}
