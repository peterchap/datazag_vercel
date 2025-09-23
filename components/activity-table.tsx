"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Filter, Calendar } from 'lucide-react';
import { formatDistanceToNow, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

// Define the transaction type
export interface Transaction {
  id: string;
  type: 'credit_purchase' | 'api_usage' | 'refund' | 'adjustment';
  amount: number;
  credits?: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: Date | string;
  payment_method?: string;
}

// Props interface for the ActivityTable component
export interface ActivityTableProps {
  transactions: Transaction[];
}

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Helper function to get status badge variant
const getStatusVariant = (status: Transaction['status']) => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
};

// Helper function to get transaction type display
const getTransactionTypeDisplay = (type: Transaction['type']) => {
  switch (type) {
    case 'credit_purchase':
      return 'Credit Purchase';
    case 'api_usage':
      return 'API Usage';
    case 'refund':
      return 'Refund';
    case 'adjustment':
      return 'Adjustment';
    default:
      return type;
  }
};

export const ActivityTable: React.FC<ActivityTableProps> = ({ transactions }) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Filter transactions based on date range
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    let filtered = [...transactions];

    if (startDate) {
      const start = startOfDay(new Date(startDate));
      filtered = filtered.filter(transaction => {
        if (!transaction.createdAt) return false;
        const transactionDate = new Date(transaction.createdAt);
        return isAfter(transactionDate, start) || 
               format(transactionDate, 'yyyy-MM-dd') === startDate;
      });
    }

    if (endDate) {
      const end = endOfDay(new Date(endDate));
      filtered = filtered.filter(transaction => {
        if (!transaction.createdAt) return false;
        const transactionDate = new Date(transaction.createdAt);
        return isBefore(transactionDate, end) ||
               format(transactionDate, 'yyyy-MM-dd') === endDate;
      });
    }

    return filtered;
  }, [transactions, startDate, endDate]);

  // Function to convert transactions to CSV format
  const downloadCSV = (transactionsToExport = filteredTransactions) => {
    if (!transactionsToExport || transactionsToExport.length === 0) {
      alert('No transactions to download');
      return;
    }

    // Define CSV headers
    const headers = [
      'Transaction ID',
      'Type',
      'Description', 
      'Amount',
      'Credits',
      'Status',
      'Payment Method',
      'Date',
      'Time'
    ];

    // Convert transactions to CSV rows
    const csvRows = transactionsToExport.map(transaction => [
      transaction.id || 'N/A',
      getTransactionTypeDisplay(transaction.type),
      `"${(transaction.description || '').replace(/"/g, '""')}"`, // Escape quotes in description
      (transaction.amount ?? 0).toFixed(2),
      transaction.credits || 0,
      transaction.status || 'unknown',
      transaction.payment_method || 'N/A',
      transaction.createdAt ? format(new Date(transaction.createdAt), 'yyyy-MM-dd') : 'N/A',
      transaction.createdAt ? format(new Date(transaction.createdAt), 'HH:mm:ss') : 'N/A'
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    const dateRange = startDate && endDate ? `_${startDate}_to_${endDate}` : '';
    link.setAttribute('download', `transactions${dateRange}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  };

  // Function to download as Excel format
  const downloadExcel = (transactionsToExport = filteredTransactions) => {
    if (!transactionsToExport || transactionsToExport.length === 0) {
      alert('No transactions to download');
      return;
    }

    // Create Excel-compatible content with tabs as separators
    const headers = [
      'Transaction ID',
      'Type',
      'Description',
      'Amount',
      'Credits',
      'Status',
      'Payment Method',
      'Date',
      'Time'
    ];

    const excelRows = transactionsToExport.map(transaction => [
      transaction.id || 'N/A',
      getTransactionTypeDisplay(transaction.type),
      (transaction.description || '').replace(/\t/g, ' '), // Remove tabs that might break formatting
      (transaction.amount ?? 0).toFixed(2),
      transaction.credits || 0,
      transaction.status || 'unknown',
      transaction.payment_method || 'N/A',
      transaction.createdAt ? format(new Date(transaction.createdAt), 'yyyy-MM-dd') : 'N/A',
      transaction.createdAt ? format(new Date(transaction.createdAt), 'HH:mm:ss') : 'N/A'
    ]);

    // Use tab separation for Excel
    const excelContent = [
      headers.join('\t'),
      ...excelRows.map(row => row.join('\t'))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([excelContent], { 
      type: 'application/vnd.ms-excel;charset=utf-8;' 
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    const dateRange = startDate && endDate ? `_${startDate}_to_${endDate}` : '';
    link.setAttribute('download', `transactions${dateRange}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xls`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  };

  // Clear date filters
  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  // Quick date filter presets
  const setQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        No transactions found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Transaction History</h3>
          {(startDate || endDate) && (
            <Badge variant="secondary" className="text-xs">
              {filteredTransactions.length} of {transactions.length} transactions
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter Toggle Button */}
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>

          {/* Download Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadCSV()}>
                Download as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadExcel()}>
                Download as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Date Filters */}
      {showFilters && (
        <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Date Filters
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-sm">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Quick Filters</Label>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setQuickFilter(7)}
                  className="text-xs"
                >
                  7d
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setQuickFilter(30)}
                  className="text-xs"
                >
                  30d
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setQuickFilter(90)}
                  className="text-xs"
                >
                  90d
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Actions</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="w-full text-xs"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Credits</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTransactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {getTransactionTypeDisplay(transaction.type || 'unknown')}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {transaction.description || 'No description'}
              </TableCell>
              <TableCell className="text-right">
                <span className={(transaction.amount ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {(transaction.amount ?? 0) >= 0 ? '+' : ''}
                  {formatCurrency(Math.abs(transaction.amount ?? 0))}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {transaction.credits ? (
                  <span className="text-blue-600">
                    +{transaction.credits.toLocaleString()}
                  </span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(transaction.status || 'pending')}>
                  {transaction.status || 'unknown'}
                </Badge>
              </TableCell>
              <TableCell>
                {transaction.payment_method ? (
                  <span className="capitalize">{transaction.payment_method}</span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {transaction.createdAt ? (
                  formatDistanceToNow(
                    new Date(transaction.createdAt), 
                    { addSuffix: true }
                  )
                ) : (
                  'Unknown date'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ActivityTable;