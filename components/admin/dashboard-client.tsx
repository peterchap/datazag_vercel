'use client';

import { useState } from "react";
import { useAutoFetch } from "@/hooks/use-auto-fetch";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, Key, DollarSign, Activity, CreditCard, Percent, BarChart, LineChart, PieChart, Bell, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";

// --- Types for the overview stats ---
type OverviewStats = {
  totalUsers: number;
  totalApiKeys: number;
  totalTransactions: number;
  totalApiUsage: number;
  totalRevenue: number;
  pendingAdminRequests: number;
  activeDiscountCodes: number;
};
// --- Types for the data ---
type ChartData = {
  usageByDayData: { name: string; requests: number }[];
  revenueByMonthData: { name: string; revenue: number }[];
};

type Transaction = { id: number; userId: number; type: string; amount: number; status: string; createdAt: string; };
type ApiUsage = { id: number; userId: number; apiKeyId: number; endpoint: string; responseTime: number; statusCode: number; creditsUsed: number; createdAt: string; };
type PaginatedResponse<T> = { data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number; }; };
// --- End Types ---


// --- Helper Components (to reduce repetition and improve readability) ---
const StatCard = ({ title, value, loading, icon }: { title: string, value: any, loading: boolean, icon: React.ReactNode }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {loading ? <div className="h-8 w-16 bg-muted animate-pulse rounded" /> : (typeof value === 'string' ? value : formatNumber(value))}
      </div>
    </CardContent>
  </Card>
);

const ChartCard = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center text-base font-semibold">
        <div className="mr-2 text-muted-foreground">{icon}</div>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="h-80 p-0 pr-4 pb-4">{children}</CardContent>
  </Card>
);

const DataTable = ({ headers, data, loading, renderRow, pagination, onPageChange }: any) => (
  <Card>
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>{headers.map((h: string) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={headers.length} className="h-24 text-center"><div className="flex justify-center items-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div></div></TableCell></TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow><TableCell colSpan={headers.length} className="h-24 text-center">No data found.</TableCell></TableRow>
            ) : (
              data.map(renderRow)
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 border-t p-4">
          <button onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page === 1} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">Previous</button>
          <div className="text-sm font-medium">Page {pagination.page} of {pagination.totalPages}</div>
          <button onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">Next</button>
        </div>
      )}
    </CardContent>
  </Card>
);

export function AdminDashboardClient({ initialStats, initialChartData }: { initialStats: OverviewStats, initialChartData: ChartData }) {
  // Use the server-fetched data for the initial state, then poll for live updates
  const { data: stats, loading: statsLoading } = useAutoFetch<OverviewStats>(
    "/api/admin/statistics/overview", { initialData: initialStats }
  );

  const { data: chartData, loading: chartDataLoading } = useAutoFetch<ChartData>(
      "/api/admin/statistics/charts", { 
          initialData: initialChartData,
          intervalMs: 60000 // Refresh every minute
      }
  );
  
  // The charts will now use the live data passed in from the server page
  const { usageByDayData, revenueByMonthData } = chartData || {};
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [apiUsagePage, setApiUsagePage] = useState(1);
  const pageSize = 10;

  // Use server-fetched data for the initial state, then poll for live updates
  
  const { data: transactionsData, loading: transactionsLoading } = useAutoFetch<PaginatedResponse<Transaction>>(`/api/admin/statistics/transactions?page=${transactionsPage}&limit=${pageSize}`);
  const { data: apiUsageData, loading: apiUsageLoading } = useAutoFetch<PaginatedResponse<ApiUsage>>(`/api/admin/statistics/api-usage?page=${apiUsagePage}&limit=${pageSize}`);

  // Pagination handlers
  const handleTransactionsPageChange = (newPage: number) => { if (newPage > 0 && (transactionsData ? newPage <= transactionsData.pagination.totalPages : true)) setTransactionsPage(newPage); };
  const handleApiUsagePageChange = (newPage: number) => { if (newPage > 0 && (apiUsageData ? newPage <= apiUsageData.pagination.totalPages : true)) setApiUsagePage(newPage); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>
      
      {stats && stats.pendingAdminRequests > 0 && (
        <Alert className="bg-amber-100 border-amber-500 text-amber-900 dark:bg-amber-900/20 dark:border-amber-500/50 dark:text-amber-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold flex items-center"><Bell className="h-4 w-4 mr-2" /> New Admin Requests</AlertTitle>
          <AlertDescription>
            You have {stats.pendingAdminRequests} pending admin request{stats.pendingAdminRequests !== 1 ? 's' : ''} waiting for review.
            <Link href="/admin/requests" className="ml-2 underline font-medium text-amber-700 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300">Review requests</Link>
          </AlertDescription>
        </Alert>
      )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers ?? 0}
            loading={statsLoading}
            icon={<Users />}
          />
          <StatCard
            title="Total API Keys"
            value={stats?.totalApiKeys ?? 0}
            loading={statsLoading}
            icon={<Key />}
          />
          <StatCard
            title="Total Transactions"
            value={stats?.totalTransactions ?? 0}
            loading={statsLoading}
            icon={<CreditCard />}
          />
          <StatCard
            title="Total API Usage"
            value={stats?.totalApiUsage ?? 0}
            loading={statsLoading}
            icon={<Activity />}
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats?.totalRevenue ?? 0)}
            loading={statsLoading}
            icon={<DollarSign />}
          />
          <StatCard
            title="Active Discounts"
            value={stats?.activeDiscountCodes ?? 0}
            loading={statsLoading}
            icon={<Percent />}
          />
        </div>
      <style jsx global>{`
        .stat-card-value {
          font-variant-numeric: tabular-nums;
          font-feature-settings: 'tnum';
        }
      `}</style>

      {/* Charts */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="API Usage (Last 7 days)" icon={<BarChart />}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData?.usageByDayData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs><linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Area type="monotone" dataKey="requests" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRequests)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue (Last 6 months)" icon={<LineChart />}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={chartData?.revenueByMonthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
              <Bar dataKey="revenue" fill="hsl(var(--primary))" barSize={30} radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </ChartCard>
       </div>
       
      {/* Tabs for Data Tables */}
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="apiUsage">Recent API Usage</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions">
          <DataTable
            headers={["ID", "User ID", "Type", "Amount", "Status", "Date"]}
            data={transactionsData?.data}
            loading={transactionsLoading}
            renderRow={(transaction: Transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.id}</TableCell>
                <TableCell>{transaction.userId}</TableCell>
                <TableCell className="capitalize">{transaction.type}</TableCell>
                <TableCell>{formatCurrency(transaction.amount / 100)}</TableCell>
                <TableCell><Badge variant={transaction.status === 'completed' ? 'success' : 'warning'}>{transaction.status}</Badge></TableCell>
                <TableCell>{formatDate(new Date(transaction.createdAt))}</TableCell>
              </TableRow>
            )}
            pagination={transactionsData?.pagination}
            onPageChange={handleTransactionsPageChange}
          />
        </TabsContent>
        <TabsContent value="apiUsage">
           <DataTable
            headers={["ID", "User ID", "API Key ID", "Endpoint", "Response Time", "Status", "Credits Used", "Date"]}
            data={apiUsageData?.data}
            loading={apiUsageLoading}
            renderRow={(usage: ApiUsage) => (
              <TableRow key={usage.id}>
                <TableCell>{usage.id}</TableCell>
                <TableCell>{usage.userId}</TableCell>
                <TableCell>{usage.apiKeyId}</TableCell>
                <TableCell className="font-mono text-xs">{usage.endpoint}</TableCell>
                <TableCell>{usage.responseTime}ms</TableCell>
                <TableCell><Badge variant={usage.statusCode >= 200 && usage.statusCode < 300 ? 'success' : 'destructive'}>{usage.statusCode}</Badge></TableCell>
                <TableCell>{usage.creditsUsed}</TableCell>
                <TableCell>{formatDate(new Date(usage.createdAt))}</TableCell>
              </TableRow>
            )}
            pagination={apiUsageData?.pagination}
            onPageChange={handleApiUsagePageChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}