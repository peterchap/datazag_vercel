'use client';

import { useState, useEffect } from "react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PlusCircle, Copy, Trash2 } from "lucide-react";

// Define the type for an API Key, assuming it's not already in a shared schema
export type ApiKey = {
  id: number;
  name: string;
  key: string;
  active: boolean;
  created_at: string; // Or Date
};

// --- Form Schema ---
const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
});
type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>;
// --- End Form Schema ---

// This is the new Client Component that receives initial data from the server.
export function ApiKeysClient({ initialApiKeys }: { initialApiKeys: ApiKey[] }) {
  const { apiKeys: liveApiKeys, createApiKey, deleteApiKey, showNewKey, setShowNewKey, isCreating, isDeleting } = useApiKeys();
  
  // Use the server-fetched keys for the initial state, then update with live data from the hook.
  const [displayKeys, setDisplayKeys] = useState(initialApiKeys);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Keep the displayed keys in sync with the live data from the useApiKeys hook.
  useEffect(() => {
    // The hook might initially return null/undefined, so we check before updating.
    if (liveApiKeys) {
      setDisplayKeys(liveApiKeys);
    }
  }, [liveApiKeys]);

  const form = useForm<CreateApiKeyFormValues>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (data: CreateApiKeyFormValues) => {
    try {
      await createApiKey(data);
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "API key created", description: "Your new API key has been created successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error?.response?.data?.error || "Failed to create API key", variant: "destructive" });
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Copied", description: "API key copied to clipboard." });
  };

  const handleDeleteKey = async (keyId: number) => {
    try {
      await deleteApiKey(keyId);
      toast({ title: "API key deleted", description: "API key has been deleted successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error?.response?.data?.error || "Failed to delete API key", variant: "destructive" });
    }
  };

  return (
    // The old <Layout> component has been removed.
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Create and manage your API keys</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Create API Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>Give your API key a descriptive name to help you identify it later.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Production API" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={isCreating}>{isCreating ? "Creating..." : "Create API Key"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>Manage your API keys below. For security, full keys are only visible once during creation.</CardDescription>
        </CardHeader>
        <CardContent>
          {displayKeys.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Key</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {displayKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{apiKey.key}</code>
                        <Button variant="ghost" size="sm" onClick={() => handleCopyKey(apiKey.key)} title="Copy masked key"><Copy className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={apiKey.active ? "success" : "secondary"}>{apiKey.active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>{new Date(apiKey.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteKey(apiKey.id)} disabled={isDeleting}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No API keys found</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Create your first API key</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New API Key Display Dialog */}
      <Dialog open={!!showNewKey} onOpenChange={() => setShowNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎉 API Key Created Successfully!</DialogTitle>
            <DialogDescription>Copy your new API key now. You won't be able to see it again.</DialogDescription>
          </DialogHeader>
          {showNewKey && (
            <div className="space-y-4 my-4">
              <div className="flex items-center justify-between rounded-lg border bg-muted p-3">
                <code className="text-sm font-mono break-all">{showNewKey.key}</code>
                <Button variant="ghost" size="sm" onClick={() => handleCopyKey(showNewKey.key)}><Copy className="h-4 w-4" /></Button>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200"><strong>Important:</strong> Save this key in a secure location. This is the only time it will be fully visible.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowNewKey(null)} className="w-full">I have copied my key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}