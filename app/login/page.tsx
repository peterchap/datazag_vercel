'use client'

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Mail, Github, AlertCircle } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { loginMutation } = useAuth();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [oauthError, setOAuthError] = useState<string | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const router = useRouter();
  
  // Check for OAuth error parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorType = params.get('error');
    
    if (errorType) {
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (errorType === 'google-auth-failed') {
        errorMessage = 'Google authentication failed. Please try another login method.';
      } else if (errorType === 'github-auth-failed') {
        errorMessage = 'GitHub authentication failed. Please try another login method.';
      } else if (errorType === 'linkedin-auth-failed') {
        errorMessage = 'LinkedIn authentication failed. Please try another login method.';
      }
      
      setOAuthError(errorMessage);
    }
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setFormError(null);
      setOAuthError(null);
      
      await loginMutation.mutateAsync(data);
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      // Redirect will be handled by the auth provider
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Login failed. Please try again.";
      setFormError(errorMessage);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    
    try {
      // TODO: Implement password reset API call
      // await apiRequest("/auth/reset-password", {
      //   method: "POST",
      //   data: { email: resetEmail }
      // });
      
      toast({
        title: "Reset link sent",
        description: "If an account exists with this email, you'll receive a password reset link.",
      });
      
      setIsResetDialogOpen(false);
      setResetEmail("");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'github' | 'microsoft' | 'linkedin') => {
    // Use NextAuth's built-in OAuth flow
    window.location.href = `/api/auth/signin/${provider}?callbackUrl=${window.location.origin}/dashboard`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in to your account</CardTitle>
          <CardDescription>
            Enter your credentials below to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(formError || oauthError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {formError || oauthError}
              </AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sign In
              </Button>
            </form>
          </Form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => handleOAuthLogin('google')}
              className="w-full"
            >
              <SiGoogle className="mr-2 h-4 w-4" />
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuthLogin('github')}
              className="w-full"
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="flex items-center justify-between w-full text-sm">
            <button
              type="button"
              onClick={() => setIsResetDialogOpen(true)}
              className="text-primary hover:underline"
            >
              Forgot password?
            </button>
            <Link href="/register" className="text-primary hover:underline">
              Create account
            </Link>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResetDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordReset}
              disabled={isResettingPassword}
            >
              {isResettingPassword && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
