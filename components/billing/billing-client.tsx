'use client';

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useCurrency } from "@/components/currency-selector";
import { ExportableTable, TableColumn } from '@/components/exportable-table';
import { Badge } from "@/components/ui/badge";
import type { Transaction, User } from "@/shared/schema";
import { Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import Link from "next/link";

interface BillingClientProps {
  user: User | null;
  initialPaymentHistory: Transaction[];
}

export function BillingClient({ user, initialPaymentHistory }: BillingClientProps) {
  const { formatPrice } = useCurrency();
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const { toast } = useToast();

  const isStripeCustomer = !!user?.stripeCustomerId;

  const handleDownloadInvoice = async (transaction: Transaction) => {
    // Based on your console output, the Stripe session ID is in transaction.id
    // But we should also check metadata as a fallback for compatibility
    const sessionId = transaction.id && transaction.id.toString().startsWith('cs_') 
      ? transaction.id 
      : (transaction.metadata as any)?.stripeSessionId;
    
    console.log('Attempting to download invoice for sessionId:', sessionId);
    
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

  // Helper function to get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Define columns for the enhanced table
  const paymentColumns: TableColumn<Transaction>[] = [
    {
      key: 'id',
      header: 'Transaction ID',
      accessor: (transaction) => (
        <span className="font-mono text-sm">{transaction.id?.slice(-8) || 'N/A'}</span>
      ),
      csvAccessor: (transaction) => transaction.id || 'N/A',
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (transaction) => (
        <span className="max-w-[200px] truncate block">
          {transaction.description || 'No description'}
        </span>
      ),
      csvAccessor: (transaction) => transaction.description || 'No description',
    },
    {
      key: 'amountInBaseCurrencyCents',
      header: 'Amount',
      accessor: (transaction) => (
        <span className="font-semibold">
          {formatPrice(Math.abs((transaction.amountInBaseCurrencyCents ?? 0) / 100))}
        </span>
      ),
      csvAccessor: (transaction) => Math.abs((transaction.amountInBaseCurrencyCents ?? 0) / 100).toFixed(2),
      className: 'text-right',
    },
    {
      key: 'credits',
      header: 'Credits',
      accessor: (transaction) => (
        transaction.credits ? (
          <span className="text-blue-600 font-medium">
            +{new Intl.NumberFormat().format(transaction.credits)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
      csvAccessor: (transaction) => transaction.credits || 0,
      className: 'text-right',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (transaction) => (
        <Badge variant={getStatusVariant(transaction.status || 'pending')}>
          {(transaction.status || 'pending').charAt(0).toUpperCase() + (transaction.status || 'pending').slice(1)}
        </Badge>
      ),
      csvAccessor: (transaction) => transaction.status || 'pending',
    },
    {
      key: 'createdAt',
      header: 'Date',
      accessor: (transaction) => (
        transaction.createdAt ? (
          <span className="text-sm">
            {format(new Date(transaction.createdAt), 'MMM dd, yyyy')}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
      csvAccessor: (transaction) => 
        transaction.createdAt ? format(new Date(transaction.createdAt), 'yyyy-MM-dd') : 'N/A',
      className: 'text-right',
    },
    {
      key: 'metadata',
      header: 'Invoice',
      accessor: (transaction) => {
        // Check if transaction ID is a Stripe session ID or if there's one in metadata
        const sessionId = transaction.id && transaction.id.toString().startsWith('cs_') 
          ? transaction.id 
          : (transaction.metadata as any)?.stripeSessionId;
          
        const hasInvoice = !!sessionId;
        
        return hasInvoice ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadInvoice(transaction)}
            disabled={loadingInvoiceId === transaction.id}
          >
            {loadingInvoiceId === transaction.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Download'
            )}
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">Not available</span>
        );
      },
      csvAccessor: (transaction) => {
        const sessionId = transaction.id && transaction.id.toString().startsWith('cs_') 
          ? transaction.id 
          : (transaction.metadata as any)?.stripeSessionId;
        return sessionId ? 'Available' : 'Not available';
      },
    },
  ];

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
            <CardDescription>
              {isStripeCustomer 
                ? "Update payment methods or view invoices."
                : "Your billing portal will be available after your first purchase."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full">
                    <Button 
                      className="w-full" 
                      onClick={handleManageSubscription} 
                      disabled={isPortalLoading || !isStripeCustomer}
                    >
                      {isPortalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ExternalLink className="mr-2 h-4 w-4"/>}
                      Manage Stripe Payments
                    </Button>
                  </div>
                </TooltipTrigger>
                {!isStripeCustomer && (
                  <TooltipContent>
                    <p>You must make a purchase before accessing the Stripe customer portal.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
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
        <CardContent className="pt-6">
          <ExportableTable
            data={initialPaymentHistory}
            columns={paymentColumns}
            title="Payment History"
            dateField="createdAt"
            filename="payment_history"
            emptyMessage="No payment history found"
            showDateFilters={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}