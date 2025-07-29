import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { timeAgo, truncateMiddle } from "@/lib/utils";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface ActivityTableProps {
  className?: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  apiKeyId: number | null;
  status: string;
  createdAt: string;
  apiKey?: {
    key: string;
  };
}

export default function ActivityTable({ className }: ActivityTableProps) {
  const [period, setPeriod] = useState("7");
  
  const { data: transactions = [], refetch } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });
  
  // Filter transactions based on selected period
  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff < parseInt(period);
  });
  
  return (
    <Card className={className}>
      <CardHeader className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
        <CardTitle>Recent Activity</CardTitle>
        <div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[150px]">Time</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                    No activity in the selected time period
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm text-gray-500">
                      {timeAgo(transaction.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {transaction.apiKeyId 
                        ? truncateMiddle(transaction.apiKey?.key || "")
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.status === "success" || transaction.status === "completed"
                            ? "default"
                            : transaction.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200">
          <a href="/credits" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            View all activity <span className="ml-1">→</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
