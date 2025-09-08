'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { User, ApiKey, Transaction, ApiUsage } from "@/shared/schema";

export const dynamic = 'force-dynamic';
// Define the props this component expects from the server
interface UserDetailClientProps {
  user: User;
  apiKeys: ApiKey[];
  transactions: Transaction[];
  apiUsage: ApiUsage[];
}

export function UserDetailClient({ user, apiKeys, transactions, apiUsage }: UserDetailClientProps) {
  return (
    <div className="space-y-6">
      {/* User Information Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{user.firstName} {user.lastName}</CardTitle>
          <CardDescription>{user.email} - (User ID: {user.id})</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div><strong>Company:</strong> {user.company || 'N/A'}</div>
            <div><strong>Role:</strong> <Badge>{user.role}</Badge></div>
            <div><strong>Credits:</strong> <span className="font-semibold">{formatNumber(user.credits)}</span></div>
            <div><strong>Member Since:</strong> {formatDate(new Date(user.createdAt!))}</div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Interface for Details */}
      <Tabs defaultValue="apiKeys">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="apiKeys">API Keys</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="apiUsage">API Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="apiKeys">
          <Card>
            <CardHeader><CardTitle>API Keys</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Key (Masked)</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {apiKeys.length > 0 ? apiKeys.map(key => (
                    <TableRow key={key.id}>
                      <TableCell>{key.name}</TableCell>
                      <TableCell><code className="font-mono text-xs bg-muted p-1 rounded">{key.key}</code></TableCell>
                      <TableCell><Badge variant={key.active ? 'success' : 'secondary'}>{key.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>{formatDate(new Date(key.createdAt))}</TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={4} className="text-center h-24">No API keys found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
           <Card>
            <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
            <CardContent>
               <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transactions.length > 0 ? transactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(new Date(tx.createdAt))}</TableCell>
                      <TableCell><Badge variant={tx.type === 'purchase' ? 'success' : 'secondary'}>{tx.type}</Badge></TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell className={`text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{tx.amount >= 0 ? '+' : ''}{formatNumber(tx.amount)}</TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={4} className="text-center h-24">No transactions found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="apiUsage">
           <Card>
            <CardHeader><CardTitle>Recent API Usage</CardTitle></CardHeader>
            <CardContent>
               <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Endpoint</TableHead><TableHead className="text-right">Credits Used</TableHead></TableRow></TableHeader>
                <TableBody>
                  {apiUsage.length > 0 ? apiUsage.map(usage => (
                    <TableRow key={usage.id}>
                      <TableCell>{formatDate(new Date(usage.createdAt))}</TableCell>
                      <TableCell><code className="font-mono text-xs">{usage.endpoint}</code></TableCell>
                      <TableCell className="text-right">{usage.creditsUsed}</TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={3} className="text-center h-24">No API usage found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}