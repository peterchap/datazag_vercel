'use client'

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Mail, Clock, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EmailVerificationPending() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    } else {
      // Redirect to register if no email provided
      router.push('/register');
    }
  }, [searchParams, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    
    try {
      setIsResending(true);
      
      const response = await fetch('http://localhost:3000/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resend verification');
      }
      
      toast({
        title: "Verification email sent!",
        description: "Please check your inbox and spam folder.",
        variant: "default",
      });
      
      // Set cooldown to 60 seconds
      setResendCooldown(60);
      
    } catch (error: any) {
      toast({
        title: "Failed to resend email",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          
          <div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription className="mt-2">
              We've sent a verification link to your email address
            </CardDescription>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center space-x-2 pt-2">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>Registration</span>
            </div>
            <div className="flex-1 h-px bg-border"></div>
            <div className="flex items-center space-x-1 text-xs text-primary">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
              <span>Email Verification</span>
            </div>
            <div className="flex-1 h-px bg-border"></div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-muted"></div>
              <span>Security Setup</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            {/* Email display */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2">
                <span className="font-medium text-gray-900">{email}</span>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Click the verification link in the email to continue.</p>
              <p className="mt-2">Don't see it? Check your spam folder.</p>
            </div>
          </div>
          
          {/* Resend button */}
          <div className="space-y-3">
            <Button
              onClick={handleResendVerification}
              disabled={isResending || resendCooldown > 0}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Resend in {formatTime(resendCooldown)}
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend verification email
                </>
              )}
            </Button>
            
            <div className="text-center text-xs text-muted-foreground">
              You can request a new verification email every minute
            </div>
          </div>
          
          {/* Help section */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Still having trouble?</strong>
              <br />
              • Make sure to check your spam/junk folder
              <br />
              • The link expires after 24 hours
              <br />
              • Contact{" "}
              <Link href="/support" className="text-primary hover:underline">
                support
              </Link>{" "}
              if you need help
            </AlertDescription>
          </Alert>
          
          {/* Alternative actions */}
          <div className="pt-4 border-t space-y-2">
            <Button
              className="w-full"
              onClick={() => router.push('/register')}
            >
              Back to Registration
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Already verified?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}