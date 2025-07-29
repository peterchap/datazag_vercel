import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Loader2 } from "lucide-react";
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
} from "@/components/ui/dialog";

// Interface for admin request object with user details
interface AdminRequest {
  id: number;
  userId: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedBy?: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    username: string;
    email: string;
    company?: string;
  };
}

export default function AdminRequestManagement() {
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);
  const [notes, setNotes] = useState("");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending admin requests
  const { 
    data: pendingRequests, 
    isLoading: isLoadingRequests,
    error: requestsError 
  } = useQuery({
    queryKey: ["/api/admin/admin-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/admin-requests", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch admin requests");
      }
      
      return res.json() as Promise<AdminRequest[]>;
    }
  });

  // Mutation for updating admin request status
  const updateRequestMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      notes 
    }: { 
      id: number; 
      status: string; 
      notes?: string; 
    }) => {
      const res = await apiRequest("PATCH", `/api/admin/admin-requests/${id}`, { status, notes });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update admin request");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Updated",
        description: "The admin request has been updated successfully.",
        variant: "default",
      });
      setNotes("");
      setSelectedRequest(null);
      setIsApproveDialogOpen(false);
      setIsRejectDialogOpen(false);
      // Invalidate queries to refresh the requests list
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admin-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle approval
  const handleApprove = () => {
    if (!selectedRequest) return;
    updateRequestMutation.mutate({
      id: selectedRequest.id,
      status: "approved",
      notes: notes || undefined,
    });
  };

  // Handle rejection
  const handleReject = () => {
    if (!selectedRequest) return;
    updateRequestMutation.mutate({
      id: selectedRequest.id,
      status: "rejected",
      notes: notes || undefined,
    });
  };

  if (isLoadingRequests) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (requestsError) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-red-500">
            Failed to load admin requests. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Admin Access Requests</CardTitle>
      </CardHeader>

      <CardContent>
        {pendingRequests && pendingRequests.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="font-medium">{request.user?.username}</div>
                    <div className="text-sm text-muted-foreground">{request.user?.email}</div>
                  </TableCell>
                  <TableCell>{request.user?.company || "-"}</TableCell>
                  <TableCell className="max-w-xs truncate" title={request.reason}>
                    {request.reason}
                  </TableCell>
                  <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-1 w-fit">
                      <Clock className="h-3 w-3" /> Pending
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsApproveDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsRejectDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No pending admin requests found.
          </div>
        )}

        {/* Approve Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Admin Request</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve this admin request? This will grant
                the user client admin privileges.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-md bg-muted p-4">
                <div className="mb-2">
                  <span className="font-semibold">User:</span>{" "}
                  {selectedRequest?.user?.username} ({selectedRequest?.user?.email})
                </div>
                <div className="mb-2">
                  <span className="font-semibold">Reason:</span>{" "}
                  {selectedRequest?.reason}
                </div>
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-1">
                  Admin Notes (Optional)
                </label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any optional notes about this approval..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsApproveDialogOpen(false);
                  setNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={updateRequestMutation.isPending}
              >
                {updateRequestMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Approve Request"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Admin Request</DialogTitle>
              <DialogDescription>
                Are you sure you want to reject this admin request?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-md bg-muted p-4">
                <div className="mb-2">
                  <span className="font-semibold">User:</span>{" "}
                  {selectedRequest?.user?.username} ({selectedRequest?.user?.email})
                </div>
                <div className="mb-2">
                  <span className="font-semibold">Reason:</span>{" "}
                  {selectedRequest?.reason}
                </div>
              </div>
              <div>
                <label htmlFor="rejectNotes" className="block text-sm font-medium mb-1">
                  Reason for Rejection
                </label>
                <Textarea
                  id="rejectNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide a reason for rejecting this request..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectDialogOpen(false);
                  setNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleReject}
                disabled={updateRequestMutation.isPending}
              >
                {updateRequestMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Reject Request"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}