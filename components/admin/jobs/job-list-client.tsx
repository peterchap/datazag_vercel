'use client';

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import type { UploadJob } from "@/shared/schema";

// The data from our server function will include the user's email
type JobWithUser = UploadJob & { userEmail: string | null };

export function JobListClient({ initialJobs }: { initialJobs: JobWithUser[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredJobs = useMemo(() => {
    if (!searchTerm) return initialJobs;
    return initialJobs.filter(job =>
      job.jobId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, initialJobs]);

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'failed': return 'destructive';
      case 'processing': return 'default';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Manage Jobs</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Upload Jobs</CardTitle>
          <CardDescription>Search and monitor all customer file uploads.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by Job ID, user email, or filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length > 0 ? filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">{job.jobId}</TableCell>
                    <TableCell>{job.userEmail || `User ID: ${job.userId}`}</TableCell>
                    <TableCell className="font-medium">{job.fileName}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
                    </TableCell>
                    <TableCell>{job.region}</TableCell>
                    <TableCell>{formatDate(new Date(job.createdAt!))}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No jobs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}