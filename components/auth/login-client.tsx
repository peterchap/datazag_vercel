'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image'; // Import the Image component
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiGoogle, SiGithub } from "react-icons/si";
import type { SignInResponse } from 'next-auth/react';

export function LoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setVerificationMessage('Email verified successfully! You can now log in.');
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Import the SignInResponse type from next-auth/react

      const res = await signIn('credentials', {
        email,
        password,
        redirect: true,
        callbackUrl: searchParams.get('callbackUrl') || '/',
      });

      // When redirect: true, signIn returns void, so error handling should be done via the UI or callbackUrl
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center mx-auto w-full max-w-sm space-y-6">
        {/* The Datazag logo is now displayed above the login card */}
        <div className="flex items-center gap-2 font-semibold">
            <Image
                src="/dz-logo.png"
                alt="Datazag Logo"
                width={150}
                height={40}
                className="h-10 w-auto"
            />
        </div>
      <Card className="w-full">
        <CardHeader className="text-center">
          {/* The title has been updated */}
          <CardTitle style={{ fontSize: '1.25rem' }}>Welcome to the Customer Portal</CardTitle>
          <CardDescription>Enter your credentials to access your portal.</CardDescription>
        </CardHeader>
        <CardContent>
          {verificationMessage && (
            <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-center text-sm text-green-800">
              {verificationMessage}
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && (
              <p className="text-center text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => signIn('google')} disabled={loading}>
              <SiGoogle className="mr-2 h-4 w-4" /> Google
            </Button>
            <Button variant="outline" onClick={() => signIn('github')} disabled={loading}>
              <SiGithub className="mr-2 h-4 w-4" /> GitHub
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-4">
            <p className="text-center text-sm text-muted-foreground">
                <Link href="/forgot-password" passHref className="underline hover:text-primary">Forgot your password?</Link>
            </p>
            <p className="text-center text-sm text-muted-foreground">
            Don’t have an account?{' '}
            <Link href="/register" passHref className="underline hover:text-primary">Sign up</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}