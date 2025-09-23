'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatNumber } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import type { User } from "@/shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useRouter } from "next/navigation";

// This is a client component that now includes modals for user actions.
export function UserListClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [creditsToAdd, setCreditsToAdd] = useState(0);
  const [newRole, setNewRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const router = useRouter(); // To refresh the page after an action

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user =>
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, users]);
  
  // --- Action Handlers ---

  const handleActionSuccess = (message: string) => {
      toast({ title: "Success", description: message });
      // 3. This is the fix. It tells Next.js to refetch the server data for this page.
      router.refresh(); 
  };

  const handleAddCredits = async () => {
    if (!selectedUser || creditsToAdd <= 0) return;
    setIsSubmitting(true);
    try {
      // This now calls your backend API to add credits.
      await apiRequest('POST', `/api/admin/users/${selectedUser.id}/credits`, { amount: creditsToAdd });
      toast({ title: "Success", description: `Added ${creditsToAdd} credits to ${selectedUser.firstName}.` });
      router.refresh(); // Re-fetch server data to show the updated credit balance
      setIsCreditsDialogOpen(false);
      setCreditsToAdd(0);
    } catch (error) {
      toast({ title: "Error", description: "Failed to add credits.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleChangeRole = async () => {
     if (!selectedUser || !newRole) return;
     setIsSubmitting(true);
    try {
      // This now calls your backend API to change the user's role.
      await apiRequest('PATCH', `/api/admin/users/${selectedUser.id}/role`, { role: newRole });
      toast({ title: "Success", description: `${selectedUser.firstName}'s role has been updated.` });
      router.refresh(); // Re-fetch server data to show the new role
      setIsRoleDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to change role.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      // This now calls your backend API to delete the user.
      await apiRequest('DELETE', `/api/admin/users/${selectedUser.id}`);
      toast({ title: "Success", description: `User ${selectedUser.firstName} has been deleted.` });
      setUsers(users.filter(u => u.id !== selectedUser.id)); // Optimistically update the UI
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Manage Users</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Search, view, and manage all users in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm mb-4" />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Company</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Credits</TableHead><TableHead>Member Since</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.company || 'N/A'}</TableCell>
                    <TableCell><Badge>{user.role}</Badge></TableCell>
                    <TableCell className="text-right">{formatNumber(user.credits)}</TableCell>
                    <TableCell>{formatDate(new Date(user.createdAt!))}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/admin/users/${user.id}`}>View Details</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsCreditsDialogOpen(true); }}>Add Credits</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setNewRole(user.role); setIsRoleDialogOpen(true); }}>Change Role</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedUser(user); setIsDeleteDialogOpen(true); }}>Delete User</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- Dialogs for Actions --- */}
      <Dialog open={isCreditsDialogOpen} onOpenChange={setIsCreditsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Credits for {selectedUser?.firstName}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4"><Label htmlFor="credits-amount">Amount</Label><Input id="credits-amount" type="number" value={creditsToAdd} onChange={(e) => setCreditsToAdd(Number(e.target.value))} /></div>
          <DialogFooter><Button onClick={handleAddCredits} disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Credits"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Role for {selectedUser?.firstName}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4"><Label htmlFor="role-select">New Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                    <SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="client_admin">Client Admin</SelectItem><SelectItem value="business_admin">Business Admin</SelectItem></SelectContent>
                </Select>
            </div>
          <DialogFooter><Button onClick={handleChangeRole} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Are you sure?</DialogTitle><DialogDescription>This will permanently delete the user {selectedUser?.firstName}. This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>{isSubmitting ? "Deleting..." : "Delete User"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}