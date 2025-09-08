'use client';

import { useState, useEffect, useMemo, ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { Download, BarChart2, Calendar as CalendarIcon, User as UserIcon, Building, ArrowUpDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Transaction } from "@/shared/schema";

// Define the shape of the data this component will work with
type TransactionWithUser = Transaction & { userEmail: string | null, company: string | null };
type UserFilterItem = { value: string; label: string; };
type CompanyFilterItem = { value: string; label: string; };
type SortKey = keyof TransactionWithUser;

export function TransactionsClient({ initialTransactions, usersForFilter, companiesForFilter }: { initialTransactions: TransactionWithUser[], usersForFilter: UserFilterItem[], companiesForFilter: CompanyFilterItem[] }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });

  // This useEffect hook is the engine of your filters. It watches for any change
  // in the date range, selected user, or selected companies, and automatically
  // re-fetches the data from your API.
  useEffect(() => {
    const fetchFilteredData = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedUserId) params.append('userId', selectedUserId);
      if (date?.from) params.append('startDate', date.from.toISOString());
      if (date?.to) params.append('endDate', date.to.toISOString());
      selectedCompanies.forEach(company => params.append('company', company));

      try {
        const response = await fetch(`/api/admin/transactions?${params.toString()}`);
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Failed to fetch filtered transactions", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFilteredData();
  }, [date, selectedUserId, selectedCompanies]);

  // Calculate key metrics based on the currently filtered transaction data
  const metrics = useMemo(() => {
    const purchases = transactions.filter(t => t.type === 'purchase');
    const usage = transactions.filter(t => t.type === 'usage');
    // Note: 'Total Revenue' would require price data. We are calculating credits purchased instead.
    return {
      totalPurchases: purchases.length,
      creditsPurchased: purchases.reduce((sum, tx) => sum + tx.amount, 0),
      creditsUsed: Math.abs(usage.reduce((sum, tx) => sum + tx.amount, 0)),
    };
  }, [transactions]);

  // Memoized sorting logic for the table
  const sortedTransactions = useMemo(() => {
    let sortableItems = [...transactions];
    sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });
    return sortableItems;
  }, [transactions, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortKey): ReactNode => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortConfig.direction === 'ascending' ? <span className="ml-2">▲</span> : <span className="ml-2">▼</span>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Transactions</h1>

      {/* Key Metrics Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Purchases" value={formatNumber(metrics.totalPurchases)} />
        <StatCard title="Total Credits Purchased" value={formatNumber(metrics.creditsPurchased)} />
        <StatCard title="Total Credits Used" value={formatNumber(metrics.creditsUsed)} />
      </div>

      {/* Main Data Card */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>Filter and sort all transactions across the system.</CardDescription>
        </CardHeader>
        <CardContent>
            {/* Filter Controls are now located here for better context */}
            <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 border rounded-lg bg-muted/50">
                <Combobox items={[{ value: '', label: 'All Users' }, ...usersForFilter]} value={selectedUserId} setValue={setSelectedUserId} placeholder="Filter by user..." searchPlaceholder="Search users..." icon={UserIcon}/>
                <MultiSelectCombobox items={companiesForFilter} selected={selectedCompanies} setSelected={setSelectedCompanies} placeholder="Filter by company..." searchPlaceholder="Search companies..." icon={Building}/>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full md:w-[300px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (date.to ? `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}` : format(date.from, "LLL dd, y")) : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} /></PopoverContent>
                </Popover>
            </div>
            
            {/* Data Table */}
            <div className="rounded-md border">
                <Table>
                <TableHeader><TableRow>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('userEmail')}>User {getSortIndicator('userEmail')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('company')}>Company {getSortIndicator('company')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('type')}>Type {getSortIndicator('type')}</Button></TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('createdAt')}>Date {getSortIndicator('createdAt')}</Button></TableHead>
                    <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('amount')}>Amount {getSortIndicator('amount')}</Button></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                    {loading ? <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading data...</TableCell></TableRow> :
                    sortedTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                        <TableCell className="font-medium">{tx.userEmail || `User ID: ${tx.userId}`}</TableCell>
                        <TableCell>{tx.company || 'N/A'}</TableCell>
                        <TableCell><Badge variant={tx.type === 'purchase' ? 'success' : 'secondary'}>{tx.type}</Badge></TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>{formatDate(new Date(tx.createdAt))}</TableCell>
                        <TableCell className={`text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {/* This now always shows credits, which is accurate */}
                            {formatNumber(tx.amount)}
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

const StatCard = ({ title, value }: { title: string, value: string | number }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);