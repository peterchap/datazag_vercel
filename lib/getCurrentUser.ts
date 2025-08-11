import { NextRequest } from 'next/server';

export interface CurrentUser {
  id: number | string;
  email?: string;
  credits?: number;
  [k: string]: any;
}

// Resolve the current user by calling /api/me on the same deployment
export async function getCurrentUser(req: NextRequest): Promise<CurrentUser | null> {
  try {
    const meUrl = new URL('/api/me', req.url);
    const res = await fetch(meUrl, {
      method: 'GET',
      headers: {
        // Forward cookies so the auth/session on /api/me can identify the user
        cookie: req.headers.get('cookie') || '',
        accept: 'application/json',
      },
      cache: 'no-store',
      credentials: 'include',
    });

    if (!res.ok) return null;
    const data = await res.json();
    // Normalize common shapes
    const id = data?.id ?? data?.user?.id;
    if (!id) return null;
    return data?.user ?? data;
  } catch {
    return null;
  }
}