'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type ServiceStatus = {
  name: string;
  status: 'Operational' | 'Degraded' | 'Offline';
  message: string;
};

export function SystemHealthClient({ initialHealthStatus }: { initialHealthStatus: ServiceStatus[] }) {
  const router = useRouter();

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'Operational': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Degraded': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'Offline': return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };
  
  const getStatusVariant = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'Operational': return 'success';
      case 'Degraded': return 'warning';
      case 'Offline': return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">System Health</h1>
            <Button variant="outline" onClick={() => router.refresh()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
            </Button>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Live Service Status</CardTitle>
          <CardDescription>An overview of the operational status of your application's core components.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {initialHealthStatus.map((service) => (
              <div key={service.name} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-semibold">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{service.message}</p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(service.status)}>{service.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}