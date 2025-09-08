'use client'

export const dynamic = 'force-dynamic'; // Acknowledge dynamic nature

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, PlusCircle, Coins, LineChart, Wallet, Key, CreditCard } from "lucide-react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import ApiUsageChart from "@/components/api-usage-chart";
import ActivityTable from "@/components/activity-table";
import CreditBundles from "@/components/credit-bundles";
import { useAutoFetch } from "@/hooks/use-auto-fetch";
import { formatNumber } from "@/lib/utils";
import { useApiKeys } from "@/hooks/use-api-keys";
import type { User } from "@/shared/schema";

// This component receives the server-fetched data as props
export function DashboardClient({ initialUserData, initialTransactions }: { initialUserData: User | null, initialTransactions: any[] }) {
  const { activeApiKeys } = useApiKeys();

  // Use server data for the initial state
  const [user, setUser] = useState(initialUserData);
  const [transactions, setTransactions] = useState(initialTransactions);
  
  // Fetch updated user data for live updates
  const { data: updatedUserData } = useAutoFetch<User | null>("/api/me", { initialData: initialUserData, intervalMs: 5000 });
  const { data: updatedTransactions } = useAutoFetch<any[]>("/api/transactions", { initialData: initialTransactions, intervalMs: 10000 });

  useEffect(() => {
    if (updatedUserData) setUser(updatedUserData);
  }, [updatedUserData]);
  
  useEffect(() => {
    if (updatedTransactions) setTransactions(updatedTransactions);
  }, [updatedTransactions]);

  // Calculate stats from the current state
  const apiRequests = transactions.filter(tx => tx?.type === "usage").length;
  const creditsUsed = transactions
    .filter(tx => tx?.type === "usage")
    .reduce((sum, tx) => sum + Math.abs(tx?.amount || 0), 0);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div></div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button className="border border-input bg-transparent hover:bg-accent hover:text-accent-foreground" asChild>
            <Link href="/documentation" className="flex items-center">
              <FileText className="mr-2 h-4 w-4" /> View API Docs
            </Link>
          </Button>
          <Button asChild>
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
          value={formatNumber(user?.credits || 0)}
          icon={<Coins className="h-6 w-6" />}
          linkHref="/credits"
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
        <StatCard
          title="API Requests (30d)"
          value={formatNumber(apiRequests)}
          icon={<LineChart className="h-6 w-6" />}
          linkHref="/transactions"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Credits Used (30d)"
          value={formatNumber(creditsUsed)}
          icon={<Wallet className="h-6 w-6" />}
          linkHref="/transactions"
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          title="Active API Keys"
          value={formatNumber(activeApiKeys?.length || 0)}
          icon={<Key className="h-6 w-6" />}
          linkHref="/api-keys"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          title="Quick Buy"
          value="Credits"
          icon={<CreditCard className="h-6 w-6" />}
          linkHref="/credits"
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card><CardContent className="pt-6"><ApiUsageChart /></CardContent></Card>
          <Card><CardContent className="pt-6"><ActivityTable /></CardContent></Card>
        </div>
        <div className="space-y-6">
          <Card><CardContent className="pt-6"><CreditBundles /></CardContent></Card>
        </div>
      </div>
    </>
  );
}
