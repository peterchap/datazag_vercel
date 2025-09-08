'use client';

import { useState, useMemo, ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber } from "@/lib/utils";
import { useCurrency } from "@/components/currency-selector";
import type { Transaction, User } from "@/shared/schema";
import { Download, Loader2, ArrowUpDown, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Link from "next/link";

interface BillingClientProps {
  user: User | null;
  initialPaymentHistory: Transaction[];
}

type SortKey = keyof Transaction;

export function BillingClient({ user, initialPaymentHistory }: BillingClientProps) {
  const { formatPrice } = useCurrency();
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<number | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });
  const { toast } = useToast();

  const handleDownloadInvoice = async (transaction: Transaction) => {
    const sessionId = (transaction.metadata as any)?.stripeSessionId;
    if (!sessionId) {
      toast({ title: "Invoice Not Available", description: "This transaction does not have a downloadable invoice.", variant: "destructive" });
      return;
    }
    setLoadingInvoiceId(transaction.id);
    try {
      const response = await apiRequest("GET", `/api/invoices/${sessionId}`);
      const data = await response.json();
      if (data.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank');
      } else {
        throw new Error(data.error || "Could not retrieve invoice URL.");
      }
    } catch (error: any) {
      toast({ title: "Download Failed", description: error.message || "Failed to download the invoice.", variant: "destructive" });
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
        const res = await apiRequest("POST", "/api/stripe/portal");
        const data = await res.json();
        if (res.ok && data.url) {
            window.location.href = data.url;
        } else {
            throw new Error(data.error || "Could not create a portal session.");
        }
    } catch (error: any) {
        toast({
            title: "Error",
            description: error.message || "Failed to open the customer portal.",
            variant: "destructive",
        });
    } finally {
        setIsPortalLoading(false);
    }
  };

  const sortedPaymentHistory = useMemo(() => {
    let sortableItems = [...initialPaymentHistory];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [initialPaymentHistory, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortKey): ReactNode => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortConfig.direction === 'ascending' ? <span className="ml-2">▲</span> : <span className="ml-2">▼</span>;
  };

  const downloadCSV = () => {
    const headers = ["ID", "Date", "Description", "Type", "Status", "Amount", "Credits"];
    const rows = sortedPaymentHistory.map(p => [
      p.id,
      formatDate(new Date(p.createdAt)),
      `"${p.description}"`,
      p.type,
      p.status,
      p.type === 'purchase' ? (p.metadata as any)?.amountPaid / 100 : 'N/A',
      p.type === 'purchase' || p.type === 'credit' ? p.amount : 'N/A'
    ].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "payment_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Billing & Payments</h1>
        <p className="text-muted-foreground">Manage your account balance and payment history.</p>
       </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Current Balance</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold">{user?.credits ? new Intl.NumberFormat().format(user.credits) : '0'}</p></CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Manage Billing</CardTitle>
            <CardDescription>Update payment methods or view invoices.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button className="w-full" onClick={handleManageSubscription} disabled={isPortalLoading}>
              {isPortalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ExternalLink className="mr-2 h-4 w-4"/>}
              Manage Stripe Payments
            </Button>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Need More Credits?</CardTitle>
            <CardDescription>Top up your balance anytime.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild className="w-full"><Link href="/credits">Purchase Credits</Link></Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>A record of all your purchases and credit grants.</CardDescription>
          </div>
          <Button variant="outline" onClick={downloadCSV}><Download className="h-4 w-4 mr-2" />Download CSV</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Button variant="ghost" onClick={() => requestSort('createdAt')}>Date {getSortIndicator('createdAt')}</Button></TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Credits Added</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPaymentHistory.map((payment) => {
                  const stripeSessionId = (payment.metadata as any)?.stripeSessionId;
                  const amountPaid = (payment.metadata as any)?.amountPaid;
                  
                  return (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(new Date(payment.createdAt))}</TableCell>
                    <TableCell className="font-medium">{payment.description}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {/* FIX: Removed the '+' sign for a cleaner look */}
                      {payment.type === 'purchase' || payment.type === 'credit' ? `${formatNumber(payment.amount)}` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {payment.type === 'purchase' ? formatPrice(amountPaid || 0) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* FIX: The button is now disabled for non-purchase transactions to prevent 404s */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDownloadInvoice(payment)}
                        disabled={loadingInvoiceId === payment.id || payment.type !== 'purchase'}
                        title={payment.type !== 'purchase' ? "No invoice available for this transaction" : "Download Invoice"}
                      >
                        {loadingInvoiceId === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                )})
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}