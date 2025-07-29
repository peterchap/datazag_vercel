import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ApiKey {
  id: number;
  user_id: number;
  key: string;
  name: string;
  active: boolean;
  created_at: string;
}

export function useApiKeys() {
  const { toast } = useToast();
  const [showNewKey, setShowNewKey] = useState<ApiKey | null>(null);
  
  const {
    data: apiKeys = [],
    isLoading,
    error,
  } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
  });
  
  const activeApiKeys = (apiKeys || []);
  
  const createApiKeyMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      console.log("Creating API key with data:", data);
      try {
        const res = await apiRequest("POST", "/api/api-keys", data);
        console.log("API response status:", res.status, res.statusText);
        const result = await res.json();
        console.log("API response data:", result);
        return result;
      } catch (error) {
        console.error("Fetch error during API key creation:", error);
        throw error;
      }
    },
    onSuccess: (newKey) => {
      console.log("New API key created:", newKey);
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setShowNewKey(newKey);
      toast({
        title: "API Key Created",
        description: "Your new API key has been created. Make sure to copy it now, you won't be able to see it again.",
      });
    },
    onError: (error: any) => {
      console.error("API key creation error:", error);
      toast({
        title: "Error Creating API Key",
        description: error.message || "An error occurred while creating your API key.",
        variant: "destructive",
      });
    },
  });
  
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/api-keys?id=${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API Key Deleted",
        description: "Your API key has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting API Key",
        description: error.message || "An error occurred while deleting your API key.",
        variant: "destructive",
      });
    },
  });
  
  return {
    apiKeys,
    activeApiKeys,
    isLoading,
    error,
    createApiKey: createApiKeyMutation,
    deleteApiKey: deleteApiKeyMutation,
    isCreating: createApiKeyMutation.isPending,
    isDeleting: deleteApiKeyMutation.isPending,
    showNewKey,
    setShowNewKey,
  };
}
