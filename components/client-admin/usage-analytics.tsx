'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportableTable, TableColumn } from '@/components/exportable-table';
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { format } from "date-fns";

interface UsageRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  description: string;
  date: string;
  endpoint?: string;
}

interface UsageAnalyticsProps {
  initialUsageData: UsageRecord[];
  companyUsers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
}

export function UsageAnalytics({ initialUsageData, companyUsers }: UsageAnalyticsProps) {
  // Calculate summary statistics
  const summary = initialUsageData.reduce(
    (acc, record) => {
      acc.totalCredits += record.amount;
      acc.totalTransactions += 1;
      
      if (!acc.userBreakdown[record.userId]) {
        acc.userBreakdown[record.userId] = {
          userName: record.userName,
          credits: 0,
          transactions: 0
        };
      }
      
      acc.userBreakdown[record.userId].credits += record.amount;
      acc.userBreakdown[record.userId].transactions += 1;
      
      return acc;
    },
    {
      totalCredits: 0,
      totalTransactions: 0,
      userBreakdown: {} as Record<string, { userName: string; credits: number; transactions: number }>
    }
  );

  // Define columns for the usage table
  const usageColumns: TableColumn<UsageRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      accessor: (record) => (
        <span className="text-sm">
          {format(new Date(record.date), 'MMM dd, yyyy')}
          <div className="text-xs text-muted-foreground">
            {format(new Date(record.date), 'HH:mm:ss')}
          </div>
        </span>
      ),
      csvAccessor: (record) => format(new Date(record.date), 'yyyy-MM-dd HH:mm:ss'),
    },
    {
      key: 'userName',
      header: 'User',
      accessor: (record) => (
        <div>
          <div className="font-medium">{record.userName}</div>
          <div className="text-xs text-muted-foreground">{record.userEmail}</div>
        </div>
      ),
      csvAccessor: (record) => record.userName,
    },
    {
      key: 'userEmail',
      header: 'Email',
      accessor: (record) => record.userEmail,
      csvAccessor: (record) => record.userEmail,
      className: 'hidden md:table-cell',
    },
    {
      key: 'amount',
      header: 'Credits Used',
      accessor: (record) => (
        <Badge variant="outline">{formatNumber(record.amount)}</Badge>
      ),
      csvAccessor: (record) => record.amount,
      className: 'text-right',
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (record) => (
        <span className="max-w-[200px] truncate block" title={record.description}>
          {record.description}
        </span>
      ),
      csvAccessor: (record) => record.description,
    },
    {
      key: 'endpoint',
      header: 'API Endpoint',
      accessor: (record) => (
        <code className="text-xs bg-muted px-1 py-0.5 rounded">
          {record.endpoint || 'N/A'}
        </code>
      ),
      csvAccessor: (record) => record.endpoint || 'N/A',
      className: 'hidden lg:table-cell',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Usage Analytics
          </CardTitle>
          <CardDescription>
            Track credit usage across your team with detailed breakdowns and export capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Statistics */}
          {initialUsageData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Credits Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(summary.totalCredits)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.totalTransactions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Average per Transaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary.totalTransactions > 0 
                      ? formatNumber(Math.round(summary.totalCredits / summary.totalTransactions))
                      : '0'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Breakdown */}
          {Object.keys(summary.userBreakdown).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Usage by User</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(summary.userBreakdown).map(([userId, data]) => (
                  <Card key={userId}>
                    <CardContent className="p-4">
                      <div className="font-medium">{data.userName}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatNumber(data.credits)} credits • {data.transactions} transactions
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Usage Table */}
          <ExportableTable
            data={initialUsageData}
            columns={usageColumns}
            title="Usage Details"
            dateField="date"
            filename="usage_analytics"
            emptyMessage="No usage data found"
            showDateFilters={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}