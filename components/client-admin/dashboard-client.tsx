'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatNumber } from "@/lib/utils";
import { Plus, Trash2, CreditCard, BarChart3, UserPlus } from "lucide-react";
import { UsageAnalytics } from "./usage-analytics";
import { CreditTransactions } from "./credit-transactions";

interface CompanyUser {
  id: string; // Changed from number to string
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  credits: number;
  creditsUsed?: number; // Total credits used by this user
  canPurchaseCredits: boolean;
}

interface CompanyStats {
  totalUsers: number;
  totalCredits: number;
  totalCreditsUsed: number;
  availableCredits: number;
}



export function CompanyAdminDashboardClient({ 
  initialUsers, 
  companyStats,
  initialUsageData = [],
  initialTransactions = []
}: { 
  initialUsers: CompanyUser[];
  companyStats?: CompanyStats;
  initialUsageData?: any[];
  initialTransactions?: any[];
}) {
  // Debug the incoming data
  console.log('Initial users data:', initialUsers);
  console.log('Company stats:', companyStats);
  console.log('Initial usage data:', initialUsageData);
  console.log('Initial transactions:', initialTransactions);

  // Fix invalid users by using a fallback ID
  const validUsers = initialUsers.map((user, index) => {
    let validId = user.id;
    
    // If ID is invalid, try to use another field or create a temporary ID
    if (!validId || validId === 'NaN' || typeof validId === 'undefined' || validId.toString() === 'NaN') {
      // Try to use email as a temporary unique identifier
      validId = user.email || `temp_${index}`;
      console.warn('Invalid user ID found, using fallback:', { originalUser: user, fallbackId: validId });
    }
    
    return {
      ...user,
      id: String(validId) // Ensure ID is a string
    };
  });
  
  console.log('Valid users after processing:', validUsers);
  
  const [users, setUsers] = useState(validUsers);
  const [stats, setStats] = useState(companyStats || {
    totalUsers: validUsers.length,
    totalCredits: 0,
    totalCreditsUsed: 0,
    availableCredits: 0 // This will need to be updated with admin's actual credits
  });
  const [isAllocateDialogOpen, setIsAllocateDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "client_user",
    initialCredits: ""
  });
  const { toast } = useToast();

  const handlePermissionChange = async (userId: string, canPurchase: boolean) => {
    setUsers(users.map(u => u.id === userId ? { ...u, canPurchaseCredits: canPurchase } : u));
    
    try {
      console.log('Updating permissions for user:', userId, 'canPurchase:', canPurchase);
      await apiRequest('PATCH', `/api/client-admin/users/${userId}/update`, { canPurchaseCredits: canPurchase });
      toast({ title: "Permissions Updated", description: "The user's ability to purchase credits has been changed." });
    } catch (error) {
      console.error('Permission update error:', error);
      setUsers(users.map(u => u.id === userId ? { ...u, canPurchaseCredits: !canPurchase } : u));
      toast({ title: "Update Failed", description: "Could not update user permissions.", variant: "destructive" });
    }
  };

  const handleAllocateCredits = async () => {
    if (!selectedUserId || !creditAmount) return;

    const amount = parseInt(creditAmount);
    if (amount <= 0 || amount > stats.availableCredits) {
      toast({ title: "Invalid Amount", description: "Please enter a valid credit amount.", variant: "destructive" });
      return;
    }

    try {
      console.log('Allocating credits:', { userId: selectedUserId, amount });
      const response = await apiRequest('POST', `/api/client-admin/users/${selectedUserId}/allocate-credits`, { amount });
      console.log('Allocation response:', response);
      
      // Update local state for both users
      setUsers(users.map(u => {
        if (u.id === selectedUserId) {
          // Add credits to target user
          return { ...u, credits: u.credits + amount };
        }
        if (u.role === 'client_admin') {
          // Subtract credits from admin
          return { ...u, credits: u.credits - amount };
        }
        return u;
      }));
      
      setStats(prev => ({
        ...prev,
        totalCredits: prev.totalCredits, // Total stays the same
        availableCredits: prev.availableCredits - amount // Available decreases
      }));

      toast({ title: "Credits Allocated", description: `${amount} credits have been allocated to the user.` });
      setIsAllocateDialogOpen(false);
      setCreditAmount("");
      setSelectedUserId(null);
    } catch (error) {
      console.error('Credit allocation error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      toast({ title: "Allocation Failed", description: "Could not allocate credits to the user.", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await apiRequest('DELETE', `/api/client-admin/users/${userId}`);
      
      const deletedUser = users.find(u => u.id === userId);
      if (deletedUser) {
        // Return unused credits to company pool
        setStats(prev => ({
          ...prev,
          totalUsers: prev.totalUsers - 1,
          availableCredits: prev.availableCredits + deletedUser.credits
        }));
      }
      
      setUsers(users.filter(u => u.id !== userId));
      toast({ title: "User Deleted", description: "The user has been removed from your company." });
    } catch (error) {
      toast({ title: "Delete Failed", description: "Could not delete the user.", variant: "destructive" });
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.email) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const initialCredits = parseInt(newUser.initialCredits) || 0;
    if (initialCredits > stats.availableCredits) {
      toast({ title: "Insufficient Credits", description: "Not enough credits available for allocation.", variant: "destructive" });
      return;
    }

    try {
      const response = await apiRequest('POST', '/api/client-admin/users', {
        ...newUser,
        initialCredits
      });
      const data = typeof response.json === "function" ? await response.json() : response; // Support both fetch and direct object

      // Add new user to local state
      const createdUser: CompanyUser = {
        id: data.id,
        ...newUser,
        credits: initialCredits,
        creditsUsed: 0,
        canPurchaseCredits: false
      };

      setUsers([...users, createdUser]);
      setStats(prev => ({
        ...prev,
        totalUsers: prev.totalUsers + 1,
        availableCredits: prev.availableCredits - initialCredits
      }));

      toast({ title: "User Created", description: "New user has been added to your company." });
      setIsCreateUserDialogOpen(false);
      setNewUser({
        firstName: "",
        lastName: "",
        email: "",
        role: "client_user",
        initialCredits: ""
      });
    } catch (error) {
      toast({ title: "Creation Failed", description: "Could not create the user.", variant: "destructive" });
    }
  };

  const openAllocateDialog = (userId: string) => {
    setSelectedUserId(userId);
    setIsAllocateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Company Admin Dashboard</h1>
        <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new user to your company.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john.doe@company.com"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client_user">Client User</SelectItem>
                    <SelectItem value="client_admin">Client Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="initialCredits">Initial Credits (Optional)</Label>
                <Input
                  id="initialCredits"
                  type="number"
                  value={newUser.initialCredits}
                  onChange={(e) => setNewUser({ ...newUser, initialCredits: e.target.value })}
                  placeholder="0"
                  max={stats.availableCredits}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Available: {formatNumber(stats.availableCredits)} credits
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Company Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.availableCredits)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits Used</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalCreditsUsed)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits Purchased</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalCredits)}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Manage Team Members</CardTitle>
          <CardDescription>View and manage your company's users, allocate credits, and control permissions.</CardDescription>
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
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-center">Can Purchase?</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'client_admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(user.credits)}</TableCell>
                    <TableCell className="text-right">{formatNumber(user.creditsUsed || 0)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={user.canPurchaseCredits}
                          onCheckedChange={(checked) => handlePermissionChange(user.id, checked)}
                          aria-label="Toggle credit purchase permission"
                        />
                        <Label className="text-xs text-muted-foreground">
                          {user.canPurchaseCredits ? 'Yes' : 'No'}
                        </Label>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAllocateDialog(user.id)}
                          className="h-8 w-8 p-0"
                        >
                          <CreditCard className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {user.firstName} {user.lastName}? 
                                This action cannot be undone. Their unused credits will be returned to the company pool.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Allocate Credits Dialog */}
      <Dialog open={isAllocateDialogOpen} onOpenChange={setIsAllocateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Credits</DialogTitle>
            <DialogDescription>
              Allocate credits to {selectedUserId ? users.find(u => u.id === selectedUserId)?.firstName : ''} from your company's available credits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="creditAmount">Credit Amount</Label>
              <Input
                id="creditAmount"
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Enter credit amount"
                max={stats.availableCredits}
                min="1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Available: {formatNumber(stats.availableCredits)} credits
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAllocateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAllocateCredits}>Allocate Credits</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Analytics */}
      <UsageAnalytics initialUsageData={initialUsageData} companyUsers={users} />

      {/* Credit Transactions */}  
      <CreditTransactions initialTransactions={initialTransactions} companyUsers={users} />
    </div>
  );
}