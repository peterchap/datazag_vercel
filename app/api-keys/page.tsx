'use client'

import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PlusCircle, Copy, Trash2 } from "lucide-react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>;

export default function ApiKeys() {
  const { apiKeys, createApiKey, deleteApiKey, showNewKey, setShowNewKey } = useApiKeys();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateApiKeyFormValues>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: CreateApiKeyFormValues) => {
    try {
      await createApiKey.mutateAsync(data);
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "API key created",
        description: "Your new API key has been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to create API key",
        variant: "destructive",
      });
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const handleDeleteKey = async (keyId: number) => {
    try {
      await deleteApiKey.mutateAsync(keyId);
      toast({
        title: "API key deleted",
        description: "API key has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const maskKey = (key: string) => {
    // The key is already masked from the API, so just return it
    // but format it nicely
    return key;
  };

  // Handle copying - for masked keys, show a helpful message
  const handleCopyMaskedKey = (maskedKey: string, keyName: string) => {
    // Copy the masked key (users might want to see the last 8 chars for reference)
    navigator.clipboard.writeText(maskedKey);
    toast({
      title: "Masked key copied",
      description: `Copied masked version of "${keyName}". Full keys are only visible during creation.`,
      variant: "default",
    });
  };

  return (
    <Layout
      title="API Keys"
      description="Manage your API keys for accessing our services"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">API Keys</h2>
          <p className="text-muted-foreground">Create and manage your API keys</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Give your API key a descriptive name to help you identify it later.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Production API" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createApiKey.isPending}>
                    {createApiKey.isPending ? "Creating..." : "Create API Key"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            Manage your API keys below. For security, keys are masked after creation. 
            Full keys are only visible once during creation - make sure to copy them then!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys && apiKeys.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2 bg-muted px-3 py-2 rounded">
                          <code className="text-sm font-mono">
                            {apiKey.key}
                          </code>
                          <span className="text-xs text-muted-foreground">
                            (masked for security)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyMaskedKey(apiKey.key, apiKey.name)}
                          title="Copy masked key"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={apiKey.active ? "default" : "secondary"}>
                        {apiKey.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(apiKey.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteKey(apiKey.id)}
                        disabled={deleteApiKey.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No API keys found</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create your first API key
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New API Key Display Dialog */}
      <Dialog open={!!showNewKey} onOpenChange={() => setShowNewKey(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>🎉 API Key Created Successfully!</DialogTitle>
            <DialogDescription>
              Your new API key has been created. <strong>Copy it now</strong> as you won't be able to see it again for security reasons.
            </DialogDescription>
          </DialogHeader>
          
          {showNewKey && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">API Key Name</Label>
                <div className="mt-1 p-2 bg-muted rounded text-sm">
                  {showNewKey.name}
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">API Key</Label>
                <div className="mt-1 p-3 bg-muted rounded border-2 border-dashed border-primary/50">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono break-all select-all">
                      {showNewKey.key}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyKey(showNewKey.key)}
                      className="ml-2 flex-shrink-0"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="flex items-start">
                  <div className="text-yellow-600 mr-2">⚠️</div>
                  <div className="text-sm text-yellow-800">
                    <strong>Important:</strong> This is the only time you'll see the full API key. 
                    Make sure to copy and save it in a secure location before closing this dialog.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => setShowNewKey(null)}
              className="w-full"
            >
              I've copied the key safely
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
