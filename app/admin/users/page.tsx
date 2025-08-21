'use client'

export const dynamic = 'force-dynamic';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAutoFetch } from "@/hooks/use-auto-fetch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Edit, MoreVertical, Plus, Trash2, Key, CreditCard, Activity, Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define the User type from the API
type User = {
  id: number;
  // Display fields
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email: string;
  company?: string | null;
  role: string;
  credits: number;
  canPurchaseCredits: boolean;
  // Optional metadata for details
  stripeCustomerId?: string | null;
  parentUserId?: number | null;
  creditThreshold?: number | null;
  gracePeriodEnd?: string | null;
  lastLogin?: string | null;
  active?: boolean;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
};

// Import USER_ROLES from schema
import { USER_ROLES } from "@shared/schema";

// Schema for editing a user
const editUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  company: z.string().nullable().optional(),
  credits: z.coerce.number().int().nonnegative("Credits must be a non-negative integer"),
  role: z.enum([USER_ROLES.USER, USER_ROLES.CLIENT_ADMIN, USER_ROLES.BUSINESS_ADMIN]),
  parentUserId: z.number().nullable().optional(),
  canPurchaseCredits: z.boolean().default(true),
  creditThreshold: z.coerce.number().int().nonnegative().nullable().optional(),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

export default function AdminUsers() {
  const { toast } = useToast();
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [sortKey, setSortKey] = useState<"name" | "company" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Fetch users (poll every 30s)
  const { data: users = [], loading: isLoading, refetch: refetchUsers } =
    useAutoFetch<User[]>("/api/admin/users", { intervalMs: 30000 });

  const toggleSort = (key: "name" | "company") => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedUsers = (() => {
    const arr = [...users];
    if (!sortKey) return arr;
    const getName = (u: User) =>
      ([u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "").toLowerCase();
    const getCompany = (u: User) => (u.company || "").toLowerCase();
    const cmp = (a: string, b: string) => a.localeCompare(b);
    arr.sort((a, b) => {
      const av = sortKey === "name" ? getName(a) : getCompany(a);
      const bv = sortKey === "name" ? getName(b) : getCompany(b);
      const c = cmp(av, bv);
      return sortDir === "asc" ? c : -c;
    });
    return arr;
  })();

  // Edit form
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      email: "",
      company: null,
      credits: 0,
    },
  });

  // Update user handler
  const [isUpdating, setIsUpdating] = useState(false);
  async function updateUser({
    id,
    data,
  }: {
    id: number;
    data: EditUserFormValues;
  }) {
    try {
      setIsUpdating(true);
      const response = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
      if (!response.ok) throw new Error("Failed to update user");
      await response.json();
      toast({ title: "User updated", description: "The user has been updated successfully" });
      await refetchUsers();
      setIsEditModalOpen(false);
      setSelectedUser(null);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error updating user",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  // Delete user handler
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  async function deleteUser(id: number) {
    try {
      setIsDeletingId(id);
      const response = await apiRequest("DELETE", `/api/admin/users/${id}`);
      if (!response.ok) throw new Error("Failed to delete user");
      await response.json();
      toast({ title: "User deleted", description: "The user has been deleted successfully" });
      await refetchUsers();
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsDeletingId(null);
    }
  }

  // Toggle purchase permission handler
  const [isTogglingId, setIsTogglingId] = useState<number | null>(null);
  async function togglePurchasePermission({
    id,
    canPurchase,
  }: {
    id: number;
    canPurchase: boolean;
  }) {
    try {
      setIsTogglingId(id);
      const response = await apiRequest("PATCH", `/api/admin/users/${id}`, {
        canPurchaseCredits: canPurchase,
      });
      if (!response.ok) throw new Error("Failed to update user permissions");
      const data = await response.json();
      const action = data.canPurchaseCredits ? "enabled" : "restricted";
      toast({ title: "Permission updated", description: `Credit purchases ${action} for this user` });
      await refetchUsers();
    } catch (error: any) {
      toast({
        title: "Error updating permissions",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsTogglingId(null);
    }
  }

  // Open edit modal
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    form.reset({
  username: user.username || "",
      email: user.email,
      company: user.company || null,
      credits: user.credits,
      role: user.role as any, // Type casting as any to avoid enum type issues
      parentUserId: user.parentUserId || null,
      canPurchaseCredits: user.canPurchaseCredits,
      creditThreshold: user.creditThreshold || null,
    });
    setIsEditModalOpen(true);
  };

  // onEditSubmit using the new updateUser handler
  const onEditSubmit = (data: EditUserFormValues) => {
    if (selectedUser) {
      void updateUser({ id: selectedUser.id, data });
    }
  };

  // Handle permission toggle
  const handleTogglePurchasePermission = (id: number, canPurchase: boolean) => {
    void togglePurchasePermission({ id, canPurchase });
  };

  // Handle delete user
  const handleDelete = (id: number) => {
    if (window.confirm(
      "Are you sure you want to delete this user? This action cannot be undone and will delete all associated data."
    )) {
      void deleteUser(id);
    }
  };

  return (
    <Layout
      title="User Management"
      description="Manage users of your application"
    >
      <div className="py-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
        <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>
                    <button
                      className="inline-flex items-center gap-1 select-none"
                      onClick={() => toggleSort("name")}
                    >
                      Name
                      {sortKey === "name" && (
                        <span aria-hidden>{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>
                    <button
                      className="inline-flex items-center gap-1 select-none"
                      onClick={() => toggleSort("company")}
                    >
                      Company
                      {sortKey === "company" && (
                        <span aria-hidden>{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Can Purchase</TableHead>
          <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6">
                      <div className="flex justify-center">
                        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
          sortedUsers.map((user: User) => (
            <React.Fragment key={user.id}>
                    <TableRow>
                      <TableCell>{user.id}</TableCell>
            <TableCell className="font-medium">{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || '—'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.company || "—"}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            user.role === 'business_admin' ? "bg-purple-600" : 
                            user.role === 'client_admin' ? "bg-blue-600" : 
                            "bg-gray-600"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={user.credits > 0 ? "bg-green-600" : "bg-red-600"}>
                          {user.credits.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={user.canPurchaseCredits ? "bg-emerald-500" : "bg-red-500"}
                          >
                            {user.canPurchaseCredits ? "Allowed" : "Restricted"}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => handleTogglePurchasePermission(user.id, !user.canPurchaseCredits)}
                          >
                            <svg 
                              width="15" 
                              height="15" 
                              viewBox="0 0 15 15" 
                              fill="none" 
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path 
                                d="M1.90321 7.29677C1.90321 10.341 4.11041 12.4147 6.58893 12.8439C6.87255 12.893 7.06266 13.1627 7.01355 13.4464C6.96444 13.73 6.69471 13.9201 6.41109 13.871C3.49942 13.3668 0.86084 10.9127 0.86084 7.29677C0.86084 3.73156 3.43325 1.16225 7.00552 1.16225C10.5778 1.16225 13.2143 3.73156 13.2143 7.29677C13.2143 8.39703 12.9413 9.45776 12.4684 10.3705C12.2974 10.6893 11.9009 10.7855 11.5822 10.6146C11.2634 10.4436 11.1672 10.047 11.3382 9.72823C11.7253 8.97954 11.9567 8.16481 11.9567 7.29677C11.9567 4.39614 9.90615 2.4099 7.00552 2.4099C4.10489 2.4099 1.90321 4.39614 1.90321 7.29677ZM9.14251 7.29677C9.14251 8.39422 8.25135 9.28177 7.15321 9.28177C6.05506 9.28177 5.16391 8.39422 5.16391 7.29677C5.16391 6.19933 6.05506 5.31177 7.15321 5.31177C8.25135 5.31177 9.14251 6.19933 9.14251 7.29677ZM10.1696 7.29677C10.1696 8.97527 8.82209 10.321 7.15321 10.321C5.48432 10.321 4.13678 8.97527 4.13678 7.29677C4.13678 5.61828 5.48432 4.2725 7.15321 4.2725C8.82209 4.2725 10.1696 5.61828 10.1696 7.29677Z"
                                fill="currentColor" 
                                fillRule="evenodd" 
                                clipRule="evenodd"
                              />
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{user.lastLogin ? formatDate(new Date(user.lastLogin)) : '—'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={async () => {
                              try {
                                const res = await fetch(`/api/admin/users/${user.id}/force-password-reset`, { method: 'POST' });
                                if (!res.ok) throw new Error('Failed to flag reset');
                                toast({ title: 'Password reset flagged', description: 'User will be asked to reset on next login.'});
                              } catch (e: any) {
                                toast({ title: 'Error', description: e?.message || 'Failed to flag password reset', variant: 'destructive' });
                              }
                            }}>
                              <Lock className="h-4 w-4 mr-2" />
                              Force password reset
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setExpanded((prev) => ({ ...prev, [user.id]: !prev[user.id] }))}>
                              {expanded[user.id] ? 'Hide details' : 'View details'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit user
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => router.push(`/admin/users/${user.id}/api-keys`)}
                            >
                              <Key className="h-4 w-4 mr-2" />
                              Manage API keys
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => router.push(`/admin/users/${user.id}/transactions`)}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              View transactions
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => router.push(`/admin/users/${user.id}/api-usage`)}
                            >
                              <Activity className="h-4 w-4 mr-2" />
                              View API usage
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {expanded[user.id] && (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <div className="bg-muted/30 rounded-md p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Stripe Customer ID</div>
                              <div className="font-medium">{user.stripeCustomerId || '—'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Parent User ID</div>
                              <div className="font-medium">{user.parentUserId ?? '—'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Credit Threshold</div>
                              <div className="font-medium">{user.creditThreshold ?? '—'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Grace Period End</div>
                              <div className="font-medium">{user.gracePeriodEnd ? formatDate(new Date(user.gracePeriodEnd)) : '—'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Active</div>
                              <div className="font-medium">{user.active ? 'Yes' : 'No'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Email Verified</div>
                              <div className="font-medium">{user.emailVerified ? 'Yes' : 'No'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Two-Factor Enabled</div>
                              <div className="font-medium">{user.twoFactorEnabled ? 'Yes' : 'No'}</div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
    </React.Fragment>
      ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit User Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update the user details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onEditSubmit)}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Username
                  </Label>
                  <Input
                    id="username"
                    {...form.register("username")}
                    className="col-span-3"
                  />
                  {form.formState.errors.username && (
                    <p className="text-sm text-destructive col-start-2 col-span-3">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    className="col-span-3"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive col-start-2 col-span-3">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="company" className="text-right">
                    Company
                  </Label>
                  <Input
                    id="company"
                    {...form.register("company")}
                    className="col-span-3"
                  />
                  {form.formState.errors.company && (
                    <p className="text-sm text-destructive col-start-2 col-span-3">
                      {form.formState.errors.company.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="credits" className="text-right">
                    Credits
                  </Label>
                  <Input
                    id="credits"
                    type="number"
                    {...form.register("credits")}
                    className="col-span-3"
                  />
                  {form.formState.errors.credits && (
                    <p className="text-sm text-destructive col-start-2 col-span-3">
                      {form.formState.errors.credits.message}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select 
                    onValueChange={(value) => form.setValue('role', value as any)}
                    defaultValue={form.getValues('role')}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={USER_ROLES.USER}>Regular User</SelectItem>
                      <SelectItem value={USER_ROLES.CLIENT_ADMIN}>Client Admin</SelectItem>
                      <SelectItem value={USER_ROLES.BUSINESS_ADMIN}>Business Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.role && (
                    <p className="text-sm text-destructive col-start-2 col-span-3">
                      {form.formState.errors.role.message?.toString()}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 py-4">
                  <h3 className="font-medium">Credit Management</h3>
                  <Separator />
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">
                      Credit Purchases
                    </Label>
                    <div className="flex items-center space-x-2 col-span-3">
                      <Switch 
                        id="canPurchaseCredits"
                        checked={form.watch('canPurchaseCredits')}
                        onCheckedChange={(checked) => {
                          form.setValue('canPurchaseCredits', checked);
                        }}
                      />
                      <Label htmlFor="canPurchaseCredits">
                        {form.watch('canPurchaseCredits') ? 'Allowed' : 'Restricted'}
                      </Label>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="creditThreshold" className="text-right">
                      Credit Threshold
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="creditThreshold"
                        type="number"
                        placeholder="Enter threshold (leave empty for none)"
                        {...form.register("creditThreshold")}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Set a threshold to notify users when their credits fall below this value.
                      </p>
                    </div>
                    {form.formState.errors.creditThreshold && (
                      <p className="text-sm text-destructive col-start-2 col-span-3">
                        {form.formState.errors.creditThreshold.message?.toString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
