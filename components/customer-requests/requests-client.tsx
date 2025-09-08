'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useRouter } from "next/navigation";
import type { AdminRequest, RequestComment } from "@/shared/schema";
import { Send, MessageSquare, Loader2 } from "lucide-react";

// --- Types ---
type RequestWithComments = AdminRequest & { comments: RequestComment[] };
const requestFormSchema = z.object({
  category: z.enum(["Enhancement", "Bug", "Billing", "General"], { required_error: "Please select a category." }),
  subject: z.string().min(5, "Subject must be at least 5 characters.").max(100),
  description: z.string().min(20, "Description must be at least 20 characters.").max(2000),
});
type RequestFormValues = z.infer<typeof requestFormSchema>;

// --- Main Client Component ---
export function RequestsClient({ initialRequests }: { initialRequests: RequestWithComments[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithComments | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // This handler is now passed down to the form component
  const handleNewRequestSuccess = (newRequest: AdminRequest) => {
    setRequests([{ ...newRequest, comments: [] }, ...requests]);
    toast({ title: "Request Submitted" });
    router.refresh();
  };
  
  // This handler is now passed down to the dialog component
  const handleCommentSuccess = (requestId: number, newComment: RequestComment) => {
      const updatedRequests = requests.map(r => 
        r.id === requestId 
          ? { ...r, comments: [...r.comments, newComment] } 
          : r
      );
      setRequests(updatedRequests);
      setSelectedRequest(updatedRequests.find(r => r.id === requestId) || null);
      toast({ title: "Comment Added" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support Requests</h1>
        <p className="text-muted-foreground">Submit a new request or view the history of your past inquiries.</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <NewRequestForm onSuccess={handleNewRequestSuccess} />
        <RequestHistoryTable requests={requests} onSelectRequest={setSelectedRequest} />
        <RequestDetailsDialog 
          request={selectedRequest} 
          onOpenChange={(open) => !open && setSelectedRequest(null)}
          onCommentSuccess={handleCommentSuccess}
        />
      </div>
    </div>
  );
}

// --- Sub-Component: New Request Form ---
function NewRequestForm({ onSuccess }: { onSuccess: (newRequest: AdminRequest) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const form = useForm<RequestFormValues>({ 
    resolver: zodResolver(requestFormSchema),
    defaultValues: { category: undefined, subject: "", description: "" }
  });
  
  const onSubmit = async (data: RequestFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/requests", data);
      const newRequest = await response.json();
      onSuccess(newRequest);
      form.reset();
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lg:col-span-1">
      <Card>
        <CardHeader>
          <CardTitle>Submit a Request</CardTitle>
          <CardDescription>Have a question or need help? Let us know.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Enhancement">Enhancement</SelectItem>
                      <SelectItem value="Bug">Bug Report</SelectItem>
                      <SelectItem value="Billing">Billing Question</SelectItem>
                      <SelectItem value="General">General Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Subject</FormLabel><FormControl><Input placeholder="e.g., Issue with API key" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Please provide as much detail as possible..." className="min-h-[150px]" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Sub-Component: Request History Table ---
function RequestHistoryTable({ requests, onSelectRequest }: { requests: RequestWithComments[], onSelectRequest: (req: RequestWithComments) => void }) {
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'closed': return 'destructive'; // Use 'destructive' for closed
      case 'in progress': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="lg:col-span-2">
      <Card>
        <CardHeader>
          <CardTitle>Your Request History</CardTitle>
          <CardDescription>Track the status of your past and present requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Last Updated</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {requests.length > 0 ? requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.subject}</TableCell>
                    <TableCell><Badge variant="outline">{req.category}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusVariant(req.status)}>{req.status}</Badge></TableCell>
                    <TableCell>{formatDate(new Date(req.updatedAt || req.createdAt || ''))}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => onSelectRequest(req)}><MessageSquare className="h-4 w-4 mr-2" />View / Reply</Button>
                    </TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">You haven't submitted any requests yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Sub-Component: Request Details Dialog ---
// --- Comment Form Schema ---
const commentFormSchema = z.object({
  comment: z.string().min(2, "Comment must be at least 2 characters.").max(2000),
});

function RequestDetailsDialog({ request, onOpenChange, onCommentSuccess }: { request: RequestWithComments | null, onOpenChange: (open: boolean) => void, onCommentSuccess: (requestId: number, newComment: RequestComment) => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const commentForm = useForm<z.infer<typeof commentFormSchema>>({ resolver: zodResolver(commentFormSchema) });

    const onCommentSubmit = async (data: z.infer<typeof commentFormSchema>) => {
        if (!request) return;
        setIsSubmitting(true);
        try {
            const response = await apiRequest("POST", `/api/requests/${request.id}/comments`, data);
            const newComment = await response.json();
            onCommentSuccess(request.id, newComment);
            commentForm.reset();
        } catch (error: any) {
            toast({ title: "Failed to add comment", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={!!request} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{request?.subject}</DialogTitle>
                    <DialogDescription>Viewing request details and conversation history.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-semibold">Original Request</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request?.description}</p>
                </div>
                {request?.comments.map(comment => (
                    <div key={comment.id} className={`p-4 rounded-lg ${comment.authorType === 'user' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <p className="text-sm font-semibold">{comment.authorType === 'user' ? 'You' : 'Support'}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.comment}</p>
                    <p className="text-xs text-muted-foreground mt-2 text-right">{comment.createdAt ? formatDate(new Date(comment.createdAt)) : "Sending..."}</p>
                    </div>
                ))}
                </div>
                <DialogFooter className="border-t pt-4">
                <Form {...commentForm}>
                    <form onSubmit={commentForm.handleSubmit(onCommentSubmit)} className="w-full space-y-2">
                    <FormField control={commentForm.control} name="comment" render={({ field }) => (
                        <FormItem><FormControl><Textarea placeholder="Type your reply..." {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        {isSubmitting ? "Sending..." : "Send Reply"}
                    </Button>
                    </form>
                </Form>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
