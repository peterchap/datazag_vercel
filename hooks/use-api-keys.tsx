'use client';

import { useState, useCallback } from "react";
import { useAutoFetch } from "./use-auto-fetch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";
import type { ApiKey } from "@/components/api-keys/api-keys-client";

export function useApiKeys() {
  const { toast } = useToast();
  const [showNewKey, setShowNewKey] = useState<ApiKey | null>(null);
  
  // This hook now correctly expects a direct array of ApiKey objects.
  const { 
    data: apiKeys, 
    loading, 
    error, 
    refetch 
  } = useAutoFetch<ApiKey[]>('/api/api-keys', {
    // Set an initial default value to prevent errors on the first render
    initialData: [], 
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const createApiKey = useCallback(async (values: { name: string }) => {
    setIsCreating(true);
    try {
      const res = await apiRequest('POST', '/api/api-keys', values);
      const newKeyData = await res.json();
      
      // The API now returns the full key object directly
      setShowNewKey(newKeyData); 
      refetch(); // Refetch the list to include the new (masked) key
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create API key", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  }, [refetch, toast]);

  const deleteApiKey = useCallback(async (keyId: number) => {
    setIsDeleting(true);
    try {
      // We need a DELETE proxy endpoint for this to work
      await apiRequest('DELETE', `/api/api-keys/${keyId}`); 
      toast({ title: "API key deleted", description: "The API key has been deleted." });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete API key", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  }, [refetch, toast]);
  
  return {
    // The hook now returns the data directly as `apiKeys`.
    apiKeys: Array.isArray(apiKeys) ? apiKeys : [],
    loading,
    error,
    refetch,
    showNewKey,
    setShowNewKey,
    isCreating,
    isDeleting,
    createApiKey,
    deleteApiKey,
  };
}