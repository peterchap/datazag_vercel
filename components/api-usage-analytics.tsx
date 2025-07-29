import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import { Loader2, AlertTriangle } from '@/lib/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ApiUsage {
  endpoint: string;
  count: number;
  averageResponseTime: number;
  credits: number;
  date: string;
}

interface ApiUsageAnalyticsProps {
  className?: string;
}

const COLORS = ['#56A8F5', '#FACE55', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];

export default function ApiUsageAnalytics({ className }: ApiUsageAnalyticsProps) {
  const today = new Date();
  const defaultDateRange = {
    from: subDays(today, 30),
    to: today,
  };
  
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [view, setView] = useState<'daily' | 'endpoints' | 'credits'>('daily');
  
  const { data, isLoading, error } = useQuery<any[]>({
    queryKey: [
      '/api/api-usage/analytics',
      dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
    ],
    queryFn: getQueryFn(),
    enabled: !!(dateRange.from && dateRange.to),
  });
  
  const prepareDataForChart = () => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    if (view === 'credits') {
      const serviceData: Record<string, { service: string; totalCredits: number; endpoints: Set<string> }> = {};
      
      data.forEach((usage: any) => {
        const service = usage.apiService || 'Unknown';
        const endpoint = usage.endpoint || 'Unknown';
        
        if (!serviceData[service]) {
          serviceData[service] = { 
            service, 
            totalCredits: 0,
            endpoints: new Set()
          };
        }
        
        serviceData[service].totalCredits += (usage.creditsUsed || usage.credits || 0);
        serviceData[service].endpoints.add(endpoint);
      });
      
      return Object.values(serviceData)
        .map(item => ({
          name: `${item.service} (${item.endpoints.size} endpoints)`,
          value: item.totalCredits,
          service: item.service
        }))
        .sort((a, b) => b.value - a.value);
    }
    else if (view === 'daily') {
      const dailyData: Record<string, { date: string; count: number; totalCredits: number; totalResponseTime: number; services: Set<string> }> = {};
      
      data.forEach((usage: any) => {
        const date = usage.usageDateTime ? format(new Date(usage.usageDateTime), 'yyyy-MM-dd') : 
                    usage.createdAt ? format(new Date(usage.createdAt), 'yyyy-MM-dd') : 'Unknown';
        
        if (!dailyData[date]) {
          dailyData[date] = { 
            date, 
            count: 0, 
            totalCredits: 0,
            totalResponseTime: 0,
            services: new Set()
          };
        }
        
        dailyData[date].count += 1;
        dailyData[date].totalCredits += (usage.creditsUsed || usage.credits || 0);
        dailyData[date].services.add(usage.apiService || 'Unknown');
        
        if (usage.responseTime) {
          dailyData[date].totalResponseTime = (dailyData[date].totalResponseTime || 0) + usage.responseTime;
        }
      });
      
      return Object.values(dailyData).map(item => ({
        date: item.date,
        count: item.count,
        credits: item.totalCredits,
        services: item.services.size,
        averageResponseTime: item.totalResponseTime ? Math.round(item.totalResponseTime / item.count) : 0
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      const endpointData: Record<string, { endpoint: string; service: string; count: number; totalCredits: number; totalResponseTime: number }> = {};
      
      data.forEach((usage: any) => {
        const endpoint = usage.endpoint || 'Unknown';
        const service = usage.apiService || 'Unknown';
        const key = `${service}:${endpoint}`;
        
        if (!endpointData[key]) {
          endpointData[key] = { 
            endpoint: `${service} - ${endpoint}`, 
            service,
            count: 0, 
            totalCredits: 0,
            totalResponseTime: 0
          };
        }
        
        endpointData[key].count += 1;
        endpointData[key].totalCredits += (usage.creditsUsed || usage.credits || 0);
        
        if (usage.responseTime) {
          endpointData[key].totalResponseTime += usage.responseTime;
        }
      });
      
      return Object.values(endpointData).map(item => ({
        endpoint: item.endpoint,
        service: item.service,
        count: item.count,
        credits: item.totalCredits,
        averageResponseTime: item.totalResponseTime ? Math.round(item.totalResponseTime / item.count) : 0
      })).sort((a, b) => b.count - a.count);
    }
  };
  
  const chartData = prepareDataForChart();
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>API Usage Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>API Usage Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load analytics data. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>API Usage Analytics</CardTitle>
        <CardDescription>
          View your API usage patterns, performance metrics, and credit consumption
        </CardDescription>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Tabs value={view} onValueChange={(value) => setView(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Daily Usage</TabsTrigger>
              <TabsTrigger value="endpoints">By API Endpoint</TabsTrigger>
              <TabsTrigger value="credits">By Service</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {chartData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No usage data available for the selected period.</p>
            </div>
          ) : view === 'credits' ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={view === 'daily' ? 'date' : 'endpoint'} 
                  angle={-45} 
                  textAnchor="end"
                  height={80}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="count" 
                  name="Request Count" 
                  fill="#56A8F5" 
                />
                <Bar 
                  yAxisId="right"
                  dataKey="credits" 
                  name="Credit Usage" 
                  fill="#FACE55" 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          
          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                There was an issue loading analytics data. Please try again later.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}