'use client'

// This page depends (indirectly via Layout/hooks) on authenticated session data at runtime.
// Disable static prerendering to avoid build-time useSession undefined errors.
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useAutoFetch } from "@/hooks/use-auto-fetch";
import Link from "next/link";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Users,
  Key,
  CreditCard,
  Activity,
  DollarSign,
  Percent,
  BarChart,
  PieChart,
  LineChart,
  Bell,
  AlertCircle,
  Database
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Define types for the API responses
type OverviewStats = {
  totalUsers: number;
  totalApiKeys: number;
  totalTransactions: number;
  totalApiUsage: number;
  totalRevenue: number;
  activeDiscountCodes: number;
};

type Transaction = {
  id: number;
  userId: number;
  type: string;
  amount: number;
  description: string;
  apiKeyId: number | null;
  status: string;
  createdAt: string;
};

type ApiUsage = {
  id: number;
  userId: number;
  apiKeyId: number;
  endpoint: string;
  responseTime: number;
  statusCode: number;
  creditsUsed: number;
  createdAt: string;
};

type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// Sample chart data - in a real app, this would come from the API
const usageByDayData = [
  { name: "Mon", requests: 3200 },
  { name: "Tue", requests: 4500 },
  { name: "Wed", requests: 3800 },
  { name: "Thu", requests: 5100 },
  { name: "Fri", requests: 4800 },
  { name: "Sat", requests: 2400 },
  { name: "Sun", requests: 2200 },
];

const revenueByMonthData = [
  { name: "Jan", revenue: 1200 },
  { name: "Feb", revenue: 1800 },
  { name: "Mar", revenue: 2500 },
  { name: "Apr", revenue: 2200 },
  { name: "May", revenue: 2700 },
  { name: "Jun", revenue: 3500 },
];

const apiUsageByEndpointData = [
  { name: "/api/search", value: 42 },
  { name: "/api/users", value: 28 },
  { name: "/api/products", value: 15 },
  { name: "/api/orders", value: 10 },
  { name: "/api/other", value: 5 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function AdminDashboard() {
  const { toast } = useToast();
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [apiUsagePage, setApiUsagePage] = useState(1);
  const pageSize = 10;

  // Fetch overview statistics
  const { data: stats, loading: statsLoading } = useAutoFetch<OverviewStats>(
    "/api/admin/statistics/overview"
  );

  // Fetch latest transactions
  const {
    data: transactionsData,
    loading: transactionsLoading,
  } = useAutoFetch<PaginatedResponse<Transaction>>(
    `/api/admin/statistics/transactions?page=${transactionsPage}&limit=${pageSize}`
  );

  // Fetch API usage data
  const { data: apiUsageData, loading: apiUsageLoading } = useAutoFetch<
    PaginatedResponse<ApiUsage>
  >(`/api/admin/statistics/api-usage?page=${apiUsagePage}&limit=${pageSize}`);
  
  // Fetch pending admin requests (poll every 30s)
  const { data: pendingAdminRequests, loading: pendingRequestsLoading } =
    useAutoFetch<any[]>("/api/admin/requests/pending", { intervalMs: 30000 });

  // Handle pagination for transactions
  const handleTransactionsPageChange = (newPage: number) => {
    if (newPage > 0 && (transactionsData ? newPage <= transactionsData.pagination.totalPages : true)) {
      setTransactionsPage(newPage);
    }
  };

  // Handle pagination for API usage
  const handleApiUsagePageChange = (newPage: number) => {
    if (newPage > 0 && (apiUsageData ? newPage <= apiUsageData.pagination.totalPages : true)) {
      setApiUsagePage(newPage);
    }
  };

  return (
    <Layout
      title="Admin Dashboard"
      description="Overview of system statistics and usage"
    >
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        
        {/* Notification for pending admin requests */}
        {!pendingRequestsLoading && pendingAdminRequests && Array.isArray(pendingAdminRequests) && pendingAdminRequests.length > 0 && (
          <Alert className="bg-amber-500/10 border-amber-500 mb-6">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-500 flex items-center">
              <Bell className="h-4 w-4 mr-2" /> New Admin Requests
            </AlertTitle>
            <AlertDescription className="text-amber-200">
              You have {pendingAdminRequests.length} pending admin request{pendingAdminRequests.length !== 1 ? 's' : ''} waiting for review.
              <Link href="/admin/requests" className="ml-2 underline font-medium text-amber-400 hover:text-amber-300">
                Review requests
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  formatNumber(stats?.totalUsers || 0)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total API Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  formatNumber(stats?.totalApiKeys || 0)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  formatCurrency((stats?.totalRevenue || 0) / 100)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">API Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  formatNumber(stats?.totalApiUsage || 0)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  formatNumber(stats?.totalTransactions || 0)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Discount Codes</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  formatNumber(stats?.activeDiscountCodes || 0)
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="h-4 w-4 mr-2" />
                API Usage (Last 7 days)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={usageByDayData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#8884d8"
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-4 w-4 mr-2" />
                Revenue (Last 6 months)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={revenueByMonthData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                  <Bar
                    dataKey="revenue"
                    fill="#0088FE"
                    barSize={30}
                    radius={[4, 4, 0, 0]}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="h-4 w-4 mr-2" />
                API Usage by Endpoint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row items-center justify-center h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={apiUsageByEndpointData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {apiUsageByEndpointData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} requests`, "API Calls"]} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Transactions and API Usage */}
        <Tabs defaultValue="transactions">
          <TabsList>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
            <TabsTrigger value="apiUsage">Recent API Usage</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6">
                          <div className="flex justify-center">
                            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !transactionsData?.data || transactionsData.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactionsData.data.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.id}</TableCell>
                          <TableCell>{transaction.userId}</TableCell>
                          <TableCell className="capitalize">{transaction.type}</TableCell>
                          <TableCell>{formatCurrency(transaction.amount / 100)}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                transaction.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : transaction.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {transaction.status}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(new Date(transaction.createdAt))}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {transactionsData && transactionsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-end p-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTransactionsPageChange(transactionsPage - 1)}
                        disabled={transactionsPage === 1}
                        className="p-2 rounded-md hover:bg-muted disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span>
                        Page {transactionsPage} of {transactionsData.pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handleTransactionsPageChange(transactionsPage + 1)}
                        disabled={transactionsPage === transactionsData.pagination.totalPages}
                        className="p-2 rounded-md hover:bg-muted disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="apiUsage">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>API Key ID</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Credits Used</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiUsageLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6">
                          <div className="flex justify-center">
                            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !apiUsageData?.data || apiUsageData.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6">
                          No API usage data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      apiUsageData.data.map((usage) => (
                        <TableRow key={usage.id}>
                          <TableCell>{usage.id}</TableCell>
                          <TableCell>{usage.userId}</TableCell>
                          <TableCell>{usage.apiKeyId}</TableCell>
                          <TableCell className="font-mono text-xs">{usage.endpoint}</TableCell>
                          <TableCell>{usage.responseTime}ms</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                usage.statusCode >= 200 && usage.statusCode < 300
                                  ? "bg-green-100 text-green-800"
                                  : usage.statusCode >= 400
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {usage.statusCode}
                            </span>
                          </TableCell>
                          <TableCell>{usage.creditsUsed}</TableCell>
                          <TableCell>{formatDate(new Date(usage.createdAt))}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {apiUsageData && apiUsageData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-end p-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApiUsagePageChange(apiUsagePage - 1)}
                        disabled={apiUsagePage === 1}
                        className="p-2 rounded-md hover:bg-muted disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span>
                        Page {apiUsagePage} of {apiUsageData.pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handleApiUsagePageChange(apiUsagePage + 1)}
                        disabled={apiUsagePage === apiUsageData.pagination.totalPages}
                        className="p-2 rounded-md hover:bg-muted disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
