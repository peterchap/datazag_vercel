'use client';

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import type { UploadJob } from "@/shared/schema";

// --- Form Schema ---
const uploadFormSchema = z.object({
  description: z.string().max(500, "Description cannot exceed 500 characters.").optional(),
  region: z.enum(["US", "EU"], { required_error: "Processing region is required." }),
  file: z.instanceof(File).refine(file => file.size > 0, "A file is required."),
});
type UploadFormValues = z.infer<typeof uploadFormSchema>;
// --- End Schema ---

export function FileUploadClient({ initialUploadHistory }: { initialUploadHistory: UploadJob[] }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
  });
  
  const onSubmit = async (data: UploadFormValues) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("description", data.description || "");
    formData.append("region", data.region);

    // Use XMLHttpRequest to get upload progress
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      const response = JSON.parse(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        toast({
          title: "Upload Successful",
          description: `Your file has been submitted with Job ID: ${response.jobId}`,
        });
        form.reset();
        // In a real app, you would refresh the job history table here
        window.location.reload(); 
      } else {
        toast({
          title: "Upload Failed",
          description: response.error || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    };
    
    xhr.onerror = () => {
        setIsUploading(false);
        toast({ title: "Upload Failed", description: "A network error occurred.", variant: "destructive" });
    };

    xhr.send(formData);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Bulk Processing</h1>
        <p className="text-muted-foreground">Upload your files for data cleaning and enrichment.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit New Job</CardTitle>
          <CardDescription>Select a file and provide any specific requirements for processing.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* File Input */}
                <div className="space-y-2">
                    <Label htmlFor="file">Data File</Label>
                    <Input id="file" type="file" onChange={(e) => form.setValue('file', e.target.files?.[0]!)} disabled={isUploading} />
                    {form.formState.errors.file && <p className="text-sm text-red-600">{form.formState.errors.file.message}</p>}
                </div>
                 {/* Region Select */}
                <div className="space-y-2">
                    <Label htmlFor="region">Processing Region</Label>
                    <Select onValueChange={(value) => form.setValue('region', value as "US" | "EU")} disabled={isUploading}>
                        <SelectTrigger><SelectValue placeholder="Select a region (US or EU)" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="US">United States (US)</SelectItem>
                            <SelectItem value="EU">Europe (EU)</SelectItem>
                        </SelectContent>
                    </Select>
                     {form.formState.errors.region && <p className="text-sm text-red-600">{form.formState.errors.region.message}</p>}
                </div>
            </div>
            {/* Description Textarea */}
            <div className="space-y-2">
              <Label htmlFor="description">Description & Requirements (Optional)</Label>
              <Textarea id="description" placeholder="e.g., 'Please clean email addresses and format phone numbers to E.164 standard.'" {...form.register("description")} disabled={isUploading} />
            </div>

            {isUploading && (
              <div className="w-full bg-muted rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}

            <Button type="submit" disabled={isUploading}>
              {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <><UploadCloud className="mr-2 h-4 w-4" /> Submit Job</>}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
          <CardDescription>Track the status of your recent uploads.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Job ID</TableHead><TableHead>File Name</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead></TableRow></TableHeader>
            <TableBody>
              {initialUploadHistory.length > 0 ? initialUploadHistory.map(job => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-xs">{job.jobId}</TableCell>
                  <TableCell className="font-medium">{job.fileName}</TableCell>
                  <TableCell><Badge variant={job.status === 'Completed' ? 'success' : 'secondary'}>{job.status}</Badge></TableCell>
                  <TableCell>{formatDate(new Date(job.createdAt!))}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No upload history found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}