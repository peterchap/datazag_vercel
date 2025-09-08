'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatNumber } from "@/lib/utils";

// Define the shape of a company user
interface CompanyUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  credits: number;
  can_purchase_credits: boolean;
}

export function CompanyAdminDashboardClient({ initialUsers }: { initialUsers: CompanyUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const { toast } = useToast();

  const handlePermissionChange = async (userId: number, canPurchase: boolean) => {
    // Optimistically update the UI for a snappy experience
    setUsers(users.map(u => u.id === userId ? { ...u, can_purchase_credits: canPurchase } : u));
    
    try {
      await apiRequest('PATCH', `/api/client-admin/users/${userId}/permissions`, { canPurchaseCredits: canPurchase });
      toast({ title: "Permissions Updated", description: "The user's ability to purchase credits has been changed." });
    } catch (error) {
      // Revert the UI change on error
      setUsers(users.map(u => u.id === userId ? { ...u, can_purchase_credits: !canPurchase } : u));
      toast({ title: "Update Failed", description: "Could not update user permissions.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Company Admin Dashboard</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Manage Team Members</CardTitle>
          <CardDescription>View your company's users and manage their ability to purchase credits.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-center">Can Purchase?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant={user.role === 'client_admin' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                    <TableCell className="text-right">{formatNumber(user.credits)}</TableCell>
                    <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                            <Switch
                                checked={user.can_purchase_credits}
                                onCheckedChange={(checked) => handlePermissionChange(user.id, checked)}
                                aria-label="Toggle credit purchase permission"
                            />
                             <Label className="text-xs text-muted-foreground">{user.can_purchase_credits ? 'Yes' : 'No'}</Label>
                        </div>
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