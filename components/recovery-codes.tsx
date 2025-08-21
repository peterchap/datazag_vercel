import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, AlertTriangle, ShieldCheck } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { useAutoFetch } from '@/hooks/use-auto-fetch';

interface RecoveryCodesProps {
  userId: number;
}

export function RecoveryCodes({ userId }: RecoveryCodesProps) {
  const [showCodes, setShowCodes] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const { toast } = useToast();
  
  // Get the number of remaining recovery codes
  const { 
    data: countData,
    loading: isCountLoading,
    refetch: refetchCount
  } = useAutoFetch<{count: number}>("/api/recovery-codes/count", { enabled: !!userId });
  
  const [isGenerating, setIsGenerating] = useState(false);
  // Generate recovery codes
  const handleGenerateCodes = async () => {
    try {
      setIsGenerating(true);
      const response = await apiRequest('POST', '/api/recovery-codes/generate');
      const data = await response.json();
      if (data.codes) {
        setCodes(data.codes);
        setShowCodes(true);
        await refetchCount();
        toast({
          title: "Recovery codes generated!",
          description: "Make sure to save these codes securely.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to generate recovery codes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy codes to clipboard
  const copyToClipboard = (codesToCopy: string[]) => {
    navigator.clipboard.writeText(codesToCopy.join('\n')).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Save these codes in a secure location",
      });
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Please copy the codes manually",
        variant: "destructive",
      });
    });
  };

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            Account Recovery Codes
          </CardTitle>
          <CardDescription>
            <div className="space-y-3">
              <p className="text-base font-medium text-primary">🛡️ Protect your account with recovery codes!</p>
              <p>Recovery codes are your backup plan to regain access if you lose your password or can't access your email.</p>
              
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800 mb-2">Why you need recovery codes:</p>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>✅ Instant account access without waiting for password reset emails</p>
                  <p>✅ Works even if you lose access to your email account</p>
                  <p>✅ Each code can only be used once for maximum security</p>
                  <p>✅ Essential backup for business continuity</p>
                </div>
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCountLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : showCodes ? (
            <>
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Recovery Codes Available</AlertTitle>
                <AlertDescription>
                  You have {codes.length} recovery codes.
                </AlertDescription>
              </Alert>
          
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Your Recovery Codes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Store these codes in a secure location. They will only be shown once.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {codes.map((code, index) => (
                    <div key={index} className="font-mono bg-secondary p-2 rounded text-center">
                      {code}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(codes)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <Alert className="border-amber-500 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-600">⚠️ Your Account Needs Protection!</AlertTitle>
              <AlertDescription className="space-y-3">
                <p><strong>You don't have any recovery codes yet.</strong> This means you could lose access to your account permanently if you forget your password or lose access to your email.</p>
                
                <div className="bg-white p-3 rounded border border-amber-200">
                  <p className="text-sm font-medium text-amber-800 mb-1">Take 2 minutes now to secure your account:</p>
                  <p className="text-sm text-amber-700">Generate recovery codes and save them in your password manager, print them, or store them in a secure location. Your future self will thank you!</p>
                </div>
                
                <p className="text-sm font-medium text-amber-700">💡 Pro tip: Set up recovery codes before you need them - not after you're locked out!</p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {showCodes && (
            <Button 
              onClick={() => setShowCodes(false)}
              variant="ghost"
              disabled={isGenerating}
            >
              Close
            </Button>
          )}
          <Button 
            onClick={handleGenerateCodes}
            disabled={isGenerating}
            className={!showCodes ? 'ml-auto' : ''}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate New Codes'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default RecoveryCodes;