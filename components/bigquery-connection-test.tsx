import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Database } from '@/lib/icons';
import { useToast } from '@/hooks/use-toast';

interface BigQueryConnectionTestProps {
  className?: string;
}

export default function BigQueryConnectionTest({ className }: BigQueryConnectionTestProps) {
  const [testTriggered, setTestTriggered] = useState(false);
  const { toast } = useToast();
  
  const { data, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['/api/bigquery/test-connection'],
    enabled: testTriggered,
  });
  
  const handleTestConnection = () => {
    setTestTriggered(true);
    refetch().then((result) => {
      if (result.data?.success) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to API analytics service",
        });
      }
    });
  };
  
  const isMissingVars = data && !data.success && data.message && 
    data.message.includes('environment variables');
  
  const getStatusDisplay = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Testing connection...</span>
        </div>
      );
    }
    
    if (error) {
      return (
        <Alert variant="destructive" className="mt-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to test connection: {(error as Error).message}
          </AlertDescription>
        </Alert>
      );
    }
    
    if (data) {
      if (data.success) {
        return (
          <Alert className="mt-4 border-green-500 text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              {data.message}
            </AlertDescription>
          </Alert>
        );
      } else if (isMissingVars) {
        return (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Missing Configuration</AlertTitle>
            <AlertDescription>
              <p>{data.message}</p>
              <p className="mt-2">The API service requires environment variables:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>FASTAPI_SERVICE_URL - The URL of the API analytics service</li>
                <li>API_SERVICE_KEY - The authentication key for the service</li>
              </ul>
              <p className="mt-2">Contact your administrator to configure these values.</p>
            </AlertDescription>
          </Alert>
        );
      } else {
        return (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>
              {data.message}
            </AlertDescription>
          </Alert>
        );
      }
    }
    
    return null;
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" /> API Analytics Service Connection
        </CardTitle>
        <CardDescription>
          Test the connection to your API analytics service that tracks usage and credits
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          This will verify that your application can communicate with the API analytics service.
          The service tracks API usage, deducts credits, and provides usage analytics.
        </p>
        
        {getStatusDisplay()}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleTestConnection} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}