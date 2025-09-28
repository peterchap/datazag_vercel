'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const handleLogout = () => {
    signOut({ 
      callbackUrl: '/login',
      redirect: true 
      
    });
  };

  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-3 px-3 text-muted-foreground"
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      Log Out
    </Button>
  );
}