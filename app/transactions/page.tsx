'use client'

import { useState } from "react";
import Layout from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Define transaction type
interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  apiKeyId: number | null;
  status: string;
  createdAt: string;
  metadata: any;
}

// Define API usage type with enhanced tracking
interface ApiUsage {
  id: number;
  endpoint: string;
  apiService: string;
  creditsUsed: number;
  credits?: number; // Legacy field for backward compatibility
  queryType: string;
  status: string;
  responseTime: number;
  usageDateTime: string;
  createdAt: string;
  metadata?: any;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("history");
  
  // Fetch transactions with auto-refresh
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  
  // Fetch API usage data with auto-refresh
  const { data: apiUsage = [], isLoading: isLoadingApiUsage } = useQuery<ApiUsage[]>({
    queryKey: ["/api/api-usage"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  
  // Process data for charts
  const last30Days = [...Array(30)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });
  
  // Daily credits usage chart data
  const dailyUsageData = last30Days.map(day => {
    const dayTransactions = transactions.filter(tx => 
      tx.type === "usage" && 
      tx.createdAt.split('T')[0] === day
    );
    
    const totalUsage = dayTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    return {
      date: day,
      credits: totalUsage
    };
  });
  
  // Enhanced endpoint and service usage chart data 
  const serviceUsageMap = apiUsage.reduce((acc, usage) => {
    const service = usage.apiService || "unknown";
    if (!acc[service]) {
      acc[service] = { credits: 0, endpoints: new Set(), count: 0 };
    }
    acc[service].credits += (usage.creditsUsed || usage.credits || 0);
    acc[service].endpoints.add(usage.endpoint);
    acc[service].count += 1;
    return acc;
  }, {} as Record<string, { credits: number; endpoints: Set<string>; count: number }>);
  
  const serviceUsageData = Object.entries(serviceUsageMap).map(([service, data]) => ({
    service,
    credits: data.credits,
    endpoints: data.endpoints.size,
    requests: data.count
  }));

  const endpointUsageMap = apiUsage.reduce((acc, usage) => {
    const key = `${usage.apiService || "unknown"} - ${usage.endpoint || "unknown"}`;
    if (!acc[key]) {
      acc[key] = 0;
    }
    acc[key] += (usage.creditsUsed || usage.credits || 0);
    return acc;
  }, {} as Record<string, number>);
  
  const endpointUsageData = Object.entries(endpointUsageMap)
    .map(([endpoint, credits]) => ({
      endpoint: endpoint.replace("/api/", ""),
      credits
    }))
    .sort((a, b) => b.credits - a.credits)
    .slice(0, 10);
  
  const renderTransactionBadge = (type: string) => {
    switch (type) {
      case "purchase":
        return <Badge className="bg-green-100 text-green-800">Purchase</Badge>;
      case "usage":
        return <Badge className="bg-blue-100 text-blue-800">API Usage</Badge>;
      case "info":
        return <Badge className="bg-gray-100 text-gray-800">Info</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };
  
  return (
    <Layout
      title="Transactions & Analytics"
      description="Track your credit usage and analyze API activity"
    >
      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="history">Transaction History</TabsTrigger>
          <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
        </TabsList>
        
        {/* Transaction History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Your complete transaction history, including purchases and API usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No transactions found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-left">Description</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {formatDate(new Date(transaction.createdAt))}
                          </td>
                          <td className="px-4 py-3">
                            {renderTransactionBadge(transaction.type)}
                          </td>
                          <td className="px-4 py-3">{transaction.description}</td>
                          <td className={`px-4 py-3 text-right font-medium ${
                            transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount >= 0 ? '+' : ''}
                            {formatNumber(transaction.amount)} credits
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className={
                              transaction.status === "success" 
                                ? "border-green-500 text-green-600" 
                                : "border-red-500 text-red-600"
                            }>
                              {transaction.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Usage Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Credit Usage</CardTitle>
                <CardDescription>
                  Track your credit usage over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isLoadingTransactions ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyUsageData} margin={{ top: 5, right: 30, left: 20, bottom: 35 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45} 
                        textAnchor="end" 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`${value} credits`, 'Usage']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="credits" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                        name="Credits Used"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Usage by API Service</CardTitle>
                <CardDescription>
                  Credit consumption across different API services
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isLoadingApiUsage ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                ) : serviceUsageData.length === 0 ? (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    No API usage data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serviceUsageData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="service" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'credits') return [`${value} credits`, 'Credits Used'];
                          if (name === 'requests') return [`${value} requests`, 'Total Requests'];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="credits" fill="#8884d8" name="Credits Used" />
                      <Bar dataKey="requests" fill="#82ca9d" name="Requests" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Top API Endpoints</CardTitle>
              <CardDescription>
                Most credit-consuming endpoints across all services
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoadingApiUsage ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : endpointUsageData.length === 0 ? (
                <div className="flex justify-center items-center h-full text-gray-500">
                  No API usage data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={endpointUsageData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="endpoint" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} credits`, 'Usage']}
                    />
                    <Legend />
                    <Bar dataKey="credits" fill="#ff7c7c" name="Credits Used" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Usage Summary</CardTitle>
              <CardDescription>
                Comprehensive overview of your multi-API activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Total Credits Used</div>
                  <div className="text-2xl font-bold">
                    {formatNumber(
                      apiUsage.reduce((sum, usage) => sum + (usage.creditsUsed || usage.credits || 0), 0)
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">API Requests</div>
                  <div className="text-2xl font-bold">
                    {formatNumber(apiUsage.length)}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">API Services</div>
                  <div className="text-2xl font-bold">
                    {new Set(apiUsage.map(usage => usage.apiService || 'Unknown')).size}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Unique Endpoints</div>
                  <div className="text-2xl font-bold">
                    {new Set(apiUsage.map(usage => usage.endpoint)).size}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Current Balance</div>
                  <div className="text-2xl font-bold text-primary">
                    {formatNumber(user?.credits || 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
