'use client'

export const dynamic = 'force-dynamic'; // session-dependent dashboard

import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, PlusCircle } from "lucide-react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import ApiUsageChart from "@/components/api-usage-chart";
import ActivityTable from "@/components/activity-table";
import CreditBundles from "@/components/credit-bundles";
import { Coins, LineChart, Wallet, Key, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAutoFetch } from "@/hooks/use-auto-fetch";
import { formatNumber } from "@/lib/utils";
import { useApiKeys } from "@/hooks/use-api-keys";
import type { User } from "@/shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const { activeApiKeys } = useApiKeys();
  
  // Get transaction stats with auto-refresh
  const { data: transactions = [], error: transactionsError } = useAutoFetch<any[]>(
    "/api/transactions",
    { intervalMs: 10000 }
  );

  // Fetch updated user data
  const { data: userData } = useAutoFetch<User>("/api/me", { intervalMs: 5000 });
  
  // Use the latest user data
  const currentUser = userData || user;
  
  // Calculate stats - handle null/undefined transactions safely
  const validTransactions = Array.isArray(transactions) ? transactions : [];
  const apiRequests = validTransactions
    .filter(tx => tx && tx.type === "usage")
    .length;
    
  const creditsUsed = validTransactions
    .filter(tx => tx && tx.type === "usage")
    .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
  
  // Add error boundaries for safer rendering
  if (transactionsError) {
    console.error("Transactions error:", transactionsError);
  }

  return (
    <Layout
      title="Dashboard"
      description={`Welcome back, ${currentUser?.username || "User"}! Here's what's happening with your account.`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          {/* Title and description are in the Layout component */}
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button variant="outline" asChild className="bg-webflow-card-light text-gray-700 border-gray-200 hover:bg-webflow-card-light-hover">
            <Link href="/documentation" className="flex items-center">
              <FileText className="mr-2 h-4 w-4" /> View API Docs
            </Link>
          </Button>
          <Button asChild className="bg-webflow-primary hover:bg-webflow-primary-dark text-white">
            <Link href="/credits" className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" /> Buy Credits
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Available Credits"
          value={formatNumber(currentUser?.credits || 0)}
          icon={<Coins className="h-6 w-6" />}
          iconBgColor="bg-webflow-primary/20"
          iconColor="text-webflow-accent"
          linkText="View history"
          linkHref="/credits"
        />
        
        <StatCard
          title="API Requests (30d)"
          value={formatNumber(apiRequests)}
          icon={<LineChart className="h-6 w-6" />}
          iconBgColor="bg-webflow-primary/20"
          iconColor="text-webflow-accent"
          linkText="View analytics"
          linkHref="/transactions"
        />
        
        <StatCard
          title="Credits Used (30d)"
          value={formatNumber(creditsUsed)}
          icon={<Wallet className="h-6 w-6" />}
          iconBgColor="bg-webflow-primary/20"
          iconColor="text-webflow-accent"
          linkText="View usage"
          linkHref="/transactions"
        />
        
        <StatCard
          title="Active API Keys"
          value={formatNumber(activeApiKeys?.length || 0)}
          icon={<Key className="h-6 w-6" />}
          iconBgColor="bg-webflow-primary/20"
          iconColor="text-webflow-accent"
          linkText="Manage keys"
          linkHref="/api-keys"
        />
        
        <StatCard
          title="Quick Buy"
          value="Credits"
          icon={<CreditCard className="h-6 w-6" />}
          iconBgColor="bg-webflow-primary/20"
          iconColor="text-webflow-accent"
          linkText="Purchase now"
          linkHref="/credits"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="bg-webflow-card-light border-gray-100">
            <CardContent className="pt-6">
              <ApiUsageChart />
            </CardContent>
          </Card>
          
          <Card className="bg-webflow-card-light border-gray-100">
            <CardContent className="pt-6">
              <ActivityTable />
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Credit Bundles */}
        <div className="space-y-6">
          <Card className="bg-webflow-card-light border-gray-100">
            <CardContent className="pt-6">
              <CreditBundles />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
