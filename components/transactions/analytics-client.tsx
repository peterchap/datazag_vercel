'use client';

import { useState } from "react";
import { useAutoFetch } from "@/hooks/use-auto-fetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Loader2 } from "lucide-react";

// --- Types (Ensure these are defined or imported) ---
interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}
interface ApiUsage {
  apiService: string;
  creditsUsed: number;
  endpoint: string;
  createdAt: string;
}
// --- End Types ---

export function AnalyticsClient({ initialTransactions, initialApiUsage }: { initialTransactions: Transaction[], initialApiUsage: ApiUsage[] }) {
  // Use server-fetched data for the initial state, then poll for live updates
  const { data: transactions = [], loading: isLoadingTransactions } = useAutoFetch<Transaction[]>("/api/transactions", { initialData: initialTransactions, intervalMs: 15000 });
  const { data: apiUsage = [], loading: isLoadingApiUsage } = useAutoFetch<ApiUsage[]>("/api/api-usage", { initialData: initialApiUsage, intervalMs: 15000 });

  // --- Chart Data Processing ---
  const dailyUsageData = [...Array(30)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const day = date.toISOString().split('T')[0];
    const totalUsage = transactions
      .filter(tx => tx.type === "usage" && tx.createdAt.startsWith(day))
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return { date: day, credits: totalUsage };
  });

  const endpointUsageMap = apiUsage.reduce((acc, usage) => {
    const key = usage.endpoint || "unknown";
    acc[key] = (acc[key] || 0) + (usage.creditsUsed || 0);
    return acc;
  }, {} as Record<string, number>);
  
  const endpointUsageData = Object.entries(endpointUsageMap)
    .map(([endpoint, credits]) => ({ endpoint: endpoint.replace("/api/", ""), credits }))
    .sort((a, b) => b.credits - a.credits)
    .slice(0, 10);
  // --- End Chart Data Processing ---

  return (
    <div className="space-y-6">
       <h1 className="text-3xl font-bold">Transactions & Analytics</h1>
       <p className="text-muted-foreground">Track your credit usage and analyze your API activity.</p>

        <Tabs defaultValue="history">
            <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">Transaction History</TabsTrigger>
            <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="history">
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Your complete history of purchases and API usage.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingTransactions && transactions.length === 0 ? (
                         <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">No transactions found.</div>
                    ) : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {transactions.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell>{formatDate(new Date(tx.createdAt))}</TableCell>
                                    <TableCell><Badge variant={tx.type === 'purchase' ? 'success' : 'secondary'}>{tx.type}</Badge></TableCell>
                                    <TableCell>{tx.description}</TableCell>
                                    <TableCell className={`text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.amount >= 0 ? '+' : ''}{formatNumber(tx.amount)} credits
                                    </TableCell>
                                    <TableCell className="text-center"><Badge variant={tx.status === 'success' ? 'success' : 'destructive'}>{tx.status}</Badge></TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Daily Credit Usage (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                    {isLoadingTransactions ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : 
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyUsageData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => [formatNumber(value), 'Credits Used']} />
                            <Line type="monotone" dataKey="credits" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Top API Endpoints by Credit Usage</CardTitle>
                </CardHeader>
                <CardContent className="h-96">
                {isLoadingApiUsage ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : 
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={endpointUsageData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="endpoint" type="category" width={150} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => [formatNumber(value), 'Credits Used']} />
                            <Bar dataKey="credits" fill="hsl(var(--primary))" name="Credits Used" />
                        </BarChart>
                    </ResponsiveContainer>}
                </CardContent>
            </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}