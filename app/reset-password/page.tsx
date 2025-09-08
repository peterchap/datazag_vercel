'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  
  // This is the crucial part: we get the token from the URL search parameters.
  const token = params.get('token') || '';
  
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("Passwords don't match.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    
    setLoading(true);
    try {
      // The token is now correctly included in the payload.
      const res = await apiRequest("POST", "/api/reset-password", { token, password });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reset failed.");

      setMessage(data.message);
      toast({ title: "Success!", description: "Your password has been updated." });
      setTimeout(() => router.push('/login'), 2000);
    } catch (e: any) {
      setError(e?.message || 'Reset failed. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
        <Card className="w-full">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Create a New Password</CardTitle>
                <CardDescription>Choose a new, secure password for your account.</CardDescription>
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
                        <Label htmlFor="password">New Password</Label>
                        <Input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required disabled={loading} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="confirm">Confirm New Password</Label>
                        <Input id="confirm" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required disabled={loading} />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <Button disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Updating…' : 'Update Password'}
                    </Button>
                </form>
            )}
            </CardContent>
        </Card>
    </div>
  );
}

// The main export uses Suspense to handle the useSearchParams hook correctly.
export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordForm />
        </Suspense>
    );
}