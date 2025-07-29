import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";

interface ApiUsageChartProps {
  className?: string;
}

interface ChartData {
  name: string;
  requests: number;
}

export default function ApiUsageChart({ className }: ApiUsageChartProps) {
  // Get API usage data from server
  const { data: apiUsage = [] } = useQuery<any[]>({
    queryKey: ["/api/api-usage"],
    select: (data) => {
      // Safely handle null/undefined data
      if (!Array.isArray(data)) return [];
      
      // Group by day and count
      const grouped = data.reduce((acc: { [key: string]: number }, item) => {
        const date = new Date(item.createdAt).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
      
      // Get last 7 days
      const today = new Date();
      const last7Days: ChartData[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString();
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        last7Days.push({
          name: day,
          requests: grouped[dateStr] || 0
        });
      }
      
      return last7Days;
    }
  });
  
  // Calculate statistics
  const successRate = 99.8; // Would come from real data
  const avgResponse = 142; // Would come from real data
  const totalQueries = apiUsage 
    ? apiUsage.reduce((sum, item) => sum + item.requests, 0) 
    : 0;
  
  return (
    <Card className={className}>
      <CardHeader className="border-b border-gray-200">
        <CardTitle>API Usage</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={apiUsage || []}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="requests"
                stroke="#3b82f6"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="border border-gray-200 rounded-md p-4 text-center">
            <p className="text-sm font-medium text-gray-500">Success Rate</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{successRate}%</p>
          </div>
          <div className="border border-gray-200 rounded-md p-4 text-center">
            <p className="text-sm font-medium text-gray-500">Avg. Response</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{avgResponse}ms</p>
          </div>
          <div className="border border-gray-200 rounded-md p-4 text-center">
            <p className="text-sm font-medium text-gray-500">Total Queries</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatNumber(totalQueries)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
