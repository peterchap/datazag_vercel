'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAutoFetch } from "@/hooks/use-auto-fetch";
import { Loader2 } from "lucide-react";

// This is the shape of the new, clean data object from our API
interface ApiUsageSummary {
  successRate: number;
  avgResponse: number;
  totalQueries: number;
  chartData: { name: string; requests: number }[];
}

export default function ApiUsageChart() {
  // 1. The hook now calls the new summary endpoint and expects the new data shape.
  const { data: summary, loading } = useAutoFetch<ApiUsageSummary>("/api/analytics/summary", { 
    intervalMs: 60000, // Refresh every minute
  });
  
  if (loading && !summary) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>API Usage</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
        </Card>
    );
  }

  // 2. The statistics are now taken directly from the API response.
  const successRate = summary?.successRate ?? 100;
  const avgResponse = summary?.avgResponse ?? 0;
  const totalQueries = summary?.totalQueries ?? 0;
  const chartData = summary?.chartData ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Usage (Last 7 Days)</CardTitle>
        <CardDescription>An overview of your recent API activity and performance.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="requests" stroke="hsl(var(--primary))" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
            <p className="mt-1 text-2xl font-semibold">{successRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Avg. Response</p>
            <p className="mt-1 text-2xl font-semibold">{avgResponse}ms</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Total Queries</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(totalQueries)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
