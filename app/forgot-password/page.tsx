'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      // This calls the new Next.js proxy route
      const res = await apiRequest("POST", "/api/forgot-password", { email });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "An error occurred.");
      // This is the new, clearer success message
      setMessage(data.message);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send reset link.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Forgot Your Password?</CardTitle>
          <CardDescription>No problem. Enter your email below and we'll send you a link to reset it.</CardDescription>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="text-center text-green-600 dark:text-green-400 p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                <p>{message}</p>
                <Button asChild className="mt-4"><Link href="/login">Back to Login</Link></Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          )}
        </CardContent>
         <CardContent className="text-center border-t pt-6">
            <Link href="/login" className="text-sm text-primary hover:underline">
                Back to Login
            </Link>
         </CardContent>
      </Card>
    </div>
  );
}