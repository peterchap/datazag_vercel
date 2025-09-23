'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-3 px-3 text-muted-foreground"
      // By using the onClick handler, we ensure this is a client-side action.
      // We tell next-auth to handle the redirect for a cleaner and more reliable logout.
      onClick={() => signOut({ callbackUrl: '/login' })}
    >
      <LogOut className="h-4 w-4" />
      Log Out
    </Button>
  );
}