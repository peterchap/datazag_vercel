'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportableTable, TableColumn } from '@/components/exportable-table';
import { Badge } from "@/components/ui/badge";
import { Receipt, ArrowUpDown, Plus, Minus, RotateCcw } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { format } from "date-fns";

interface Transaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  type: 'allocation' | 'usage' | 'purchase' | 'refund';
  description: string;
  createdAt: string;
}

interface TransactionsProps {
  initialTransactions: Transaction[];
  companyUsers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
}

export function CreditTransactions({ initialTransactions, companyUsers }: TransactionsProps) {
  // Get transaction type icon and color
  const getTransactionDisplay = (type: string, amount: number) => {
    switch (type) {
      case 'allocation':
        return {
          icon: amount > 0 ? Plus : Minus,
          color: amount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
          badge: amount > 0 ? 'default' as const : 'secondary' as const
        };
      case 'usage':
        return {
          icon: Minus,
          color: 'bg-red-100 text-red-700',
          badge: 'destructive' as const
        };
      case 'purchase':
        return {
          icon: Plus,
          color: 'bg-blue-100 text-blue-700',
          badge: 'default' as const
        };
      case 'refund':
        return {
          icon: RotateCcw,
          color: 'bg-yellow-100 text-yellow-700',
          badge: 'outline' as const
        };
      default:
        return {
          icon: ArrowUpDown,
          color: 'bg-gray-100 text-gray-700',
          badge: 'secondary' as const
        };
    }
  };

  // Calculate summary statistics
  const summary = initialTransactions.reduce(
    (acc, tx) => {
      acc.totalTransactions += 1;
      
      switch (tx.type) {
        case 'allocation':
          if (tx.amount > 0) {
            acc.totalAllocated += tx.amount;
          } else {
            acc.totalDeducted += Math.abs(tx.amount);
          }
          break;
        case 'usage':
          acc.totalUsed += Math.abs(tx.amount);
          break;
        case 'purchase':
          acc.totalPurchased += tx.amount;
          break;
        case 'refund':
          acc.totalRefunded += tx.amount;
          break;
      }
      
      return acc;
    },
    {
      totalTransactions: 0,
      totalAllocated: 0,
      totalDeducted: 0,
      totalUsed: 0,
      totalPurchased: 0,
      totalRefunded: 0
    }
  );

  // Define columns for the transactions table
  const transactionColumns: TableColumn<Transaction>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      accessor: (transaction) => (
        <span className="text-sm">
          {format(new Date(transaction.createdAt), 'MMM dd, yyyy')}
          <div className="text-xs text-muted-foreground">
            {format(new Date(transaction.createdAt), 'HH:mm:ss')}
          </div>
        </span>
      ),
      csvAccessor: (transaction) => 
        format(new Date(transaction.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    },
    {
      key: 'userName',
      header: 'User',
      accessor: (transaction) => (
        <div>
          <div className="font-medium">{transaction.userName}</div>
          <div className="text-xs text-muted-foreground">{transaction.userEmail}</div>
        </div>
      ),
      csvAccessor: (transaction) => transaction.userName,
    },
    {
      key: 'type',
      header: 'Type',
      accessor: (transaction) => {
        const display = getTransactionDisplay(transaction.type, transaction.amount);
        const Icon = display.icon;
        
        return (
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-full ${display.color}`}>
              <Icon className="h-3 w-3" />
            </div>
            <Badge variant={display.badge}>
              {transaction.type}
            </Badge>
          </div>
        );
      },
      csvAccessor: (transaction) => transaction.type,
    },
    {
      key: 'amount',
      header: 'Amount',
      accessor: (transaction) => (
        <span className={transaction.amount >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
          {transaction.amount >= 0 ? '+' : ''}
          {formatNumber(transaction.amount)}
        </span>
      ),
      csvAccessor: (transaction) => transaction.amount,
      className: 'text-right',
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (transaction) => (
        <span className="max-w-[200px] truncate block" title={transaction.description}>
          {transaction.description}
        </span>
      ),
      csvAccessor: (transaction) => transaction.description,
    },
    {
      key: 'id',
      header: 'Transaction ID',
      accessor: (transaction) => (
        <span className="font-mono text-xs">{transaction.id.slice(-8)}</span>
      ),
      csvAccessor: (transaction) => transaction.id,
      className: 'hidden lg:table-cell',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Credit Transactions
        </CardTitle>
        <CardDescription>
          Complete audit trail of all credit-related activities including allocations, usage, and purchases
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        {initialTransactions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{summary.totalTransactions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Allocated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-600">{formatNumber(summary.totalAllocated)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-red-600">{formatNumber(summary.totalUsed)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Purchased</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-blue-600">{formatNumber(summary.totalPurchased)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Refunded</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-yellow-600">{formatNumber(summary.totalRefunded)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Net Change</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {formatNumber(summary.totalPurchased + summary.totalRefunded - summary.totalUsed)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transactions Table */}
        <ExportableTable
          data={initialTransactions}
          columns={transactionColumns}
          title="Transaction History"
          dateField="createdAt"
          filename="credit_transactions"
          emptyMessage="No transactions found"
          showDateFilters={true}
        />
      </CardContent>
    </Card>
  );
}