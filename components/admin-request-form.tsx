import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Interface for admin request object
interface AdminRequest {
  id: number;
  userId: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminRequestForm() {
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing admin requests for the user
  const { 
    data: adminRequests, 
    isLoading: isLoadingRequests,
    error: requestsError 
  } = useQuery({
    queryKey: ["/api/admin-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin-requests", {
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

  // Mutation for creating a new admin request
  const createRequestMutation = useMutation({
    mutationFn: async (data: { reason: string }) => {
      const res = await apiRequest("POST", "/api/admin-requests", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit admin request");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your admin access request has been submitted successfully.",
        variant: "default",
      });
      setReason("");
      // Invalidate the query to refresh the requests list
      queryClient.invalidateQueries({ queryKey: ["/api/admin-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for your admin access request.",
        variant: "destructive",
      });
      return;
    }
    createRequestMutation.mutate({ reason });
  };

  // Check if user has a pending request
  const hasPendingRequest = adminRequests?.some(
    (request) => request.status === "pending"
  );

  // Get the most recent request (for display)
  const latestRequest = adminRequests?.[0];

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return null;
    }
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
        <CardTitle className="text-xl font-semibold">Admin Access Request</CardTitle>
        <CardDescription>
          Request admin privileges to manage your team's API keys and usage.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {latestRequest && (
          <div className="mb-6 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Your Latest Request</h3>
              <StatusBadge status={latestRequest.status} />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Submitted on{" "}
              {new Date(latestRequest.createdAt).toLocaleDateString()}
            </p>
            <div className="mt-2 text-sm">
              <div className="font-medium">Reason:</div>
              <p className="mt-1">{latestRequest.reason}</p>
            </div>
            {latestRequest.adminNotes && (
              <div className="mt-3 text-sm">
                <div className="font-medium">Admin Notes:</div>
                <p className="mt-1">{latestRequest.adminNotes}</p>
              </div>
            )}
          </div>
        )}

        {!hasPendingRequest && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="reason" className="block text-sm font-medium mb-1">
                  Reason for Request
                </label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please explain why you need admin access..."
                  rows={4}
                  className="w-full"
                />
              </div>
            </div>
          </form>
        )}

        {hasPendingRequest && (
          <div className="rounded-lg p-4 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <div className="flex gap-2 items-center mb-2">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Request Pending</span>
            </div>
            <p className="text-sm">
              Your admin access request is currently under review. You'll be notified once 
              it has been processed.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end">
        {!hasPendingRequest && (
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={createRequestMutation.isPending || !reason.trim()}
          >
            {createRequestMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}