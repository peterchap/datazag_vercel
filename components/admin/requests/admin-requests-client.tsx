'use client';

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AdminRequest, User } from "@/shared/schema";

// The data from our server function will include the user object
type RequestWithUser = AdminRequest & { user: Partial<Pick<User, 'firstName' | 'lastName' | 'email'>> | null };

export function AdminRequestsClient({ initialRequests }: { initialRequests: RequestWithUser[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState<RequestWithUser | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const filteredRequests = useMemo(() => {
    return requests.filter(req => 
      (statusFilter === 'All' || req.status === statusFilter) &&
      (categoryFilter === 'All' || req.category === categoryFilter)
    );
  }, [requests, statusFilter, categoryFilter]);

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedRequest) return;
    setIsUpdating(true);
    try {
      await apiRequest('PATCH', `/api/admin/requests/${selectedRequest.id}`, { status: newStatus });
      
      // Update the local state for an instant UI refresh
      setRequests(requests.map(r => r.id === selectedRequest.id ? { ...r, status: newStatus } : r));
      setSelectedRequest({ ...selectedRequest, status: newStatus }); // Update the dialog view as well

      toast({ title: "Status Updated", description: "The request status has been successfully updated." });
    } catch (error) {
      toast({ title: "Update Failed", description: "Could not update the request status.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'closed': return 'success';
      case 'in progress': return 'default';
      case 'open':
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Requests</h1>
      <Card>
        <CardHeader>
          <CardTitle>Customer Requests</CardTitle>
          <CardDescription>View and manage all customer support requests and inquiries.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by status..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by category..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="Bug">Bug Report</SelectItem>
                <SelectItem value="Enhancement">Enhancement</SelectItem>
                <SelectItem value="Billing">Billing Question</SelectItem>
                <SelectItem value="General">General Inquiry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Category</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.user?.email || `User ID: ${req.userId}`}</TableCell>
                    <TableCell><Badge variant="outline">{req.category}</Badge></TableCell>
                    <TableCell>{req.subject}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(req.status)}>{req.status}</Badge></TableCell>
                    <TableCell>{formatDate(new Date(req.createdAt!))}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedRequest(req)}>View Details</Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No requests found for the selected filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>{selectedRequest?.subject}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm"><strong>From:</strong> {selectedRequest?.user?.email}</div>
            <div className="text-sm"><strong>Category:</strong> {selectedRequest?.category}</div>
            <div className="p-4 bg-muted rounded-md border text-sm whitespace-pre-wrap">{selectedRequest?.description}</div>
            <div className="flex items-center gap-4">
              <Label>Status</Label>
              <Select value={selectedRequest?.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              {isUpdating && <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}