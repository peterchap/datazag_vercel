import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ApiKey {
  id: number;
  user_id?: number | string;
  key: string;
  name: string;
  active: boolean;
  created_at: string;
}

export function useApiKeys() {
  const { toast } = useToast();
  const [showNewKey, setShowNewKey] = useState<ApiKey | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  const loadKeys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest("GET", "/api/api-keys");
      const json = await res.json();
      setApiKeys(json?.keys ?? []);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const createApiKey = async (data: { name: string }) => {
    setIsCreating(true);
    try {
      const res = await apiRequest("POST", "/api/api-keys", data);
      if (!res.ok) throw new Error(`Error: ${res.status}: ${await res.text()}`);
      const result = await res.json();
      setShowNewKey(result?.key);
      toast({
        title: "API Key Created",
        description: "Your new API key has been created. Copy it now; it won't be shown again.",
      });
      await loadKeys();
    } catch (error: any) {
      toast({
        title: "Error Creating API Key",
        description: error?.message || "An error occurred while creating your API key.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const deleteApiKey = async (id: number) => {
    setIsDeleting(true);
    try {
      const res = await apiRequest("DELETE", `/api/api-keys/${id}`);
      if (!res.ok) throw new Error(`Error: ${res.status}: ${await res.text()}`);
      await res.json();
      toast({ title: "API Key Deleted", description: "Your API key has been permanently deleted." });
      await loadKeys();
    } catch (error: any) {
      toast({
        title: "Error Deleting API Key",
        description: error?.message || "An error occurred while deleting your API key.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
  apiKeys,
  activeApiKeys: apiKeys,
  isLoading,
  error,
  createApiKey,
  deleteApiKey,
  isCreating,
  isDeleting,
    showNewKey,
    setShowNewKey,
  };
}
