'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailCheck, AlertTriangle } from 'lucide-react';

export function VerifyEmailPendingClient() {
  const params = useSearchParams();
  const isExpired = params.get('expired') === 'true';

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <Card className="w-full">
        <CardHeader className="text-center">
          {isExpired ? (
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          ) : (
            <MailCheck className="mx-auto h-12 w-12 text-primary" />
          )}
          <CardTitle className="text-2xl mt-4">
            {isExpired ? 'Link Expired' : 'Check Your Email'}
          </CardTitle>
          <CardDescription>
            {isExpired 
              ? "Your verification link has expired. Please try registering again to receive a new link."
              : "We've sent a verification link to your email address. Please click the link to complete your registration."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <Button asChild>
                <Link href={isExpired ? "/register" : "/login"}>
                    {isExpired ? "Back to Registration" : "Back to Login"}
                </Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}