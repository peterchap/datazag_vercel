import { NextRequest } from 'next/server';

export interface CurrentUser {
  id: number | string;
  email?: string;
  credits?: number;
  [k: string]: any;
}

function extractUserAndId(payload: any): { user: any | null; id: string | number | null } {
  if (!payload || typeof payload !== 'object') return { user: null, id: null };

  // Common shapes
  const directId = payload?.id ?? null;
  const userObj = payload?.user ?? null;
  const userId = userObj?.id ?? null;

  // Some backends wrap in `data`
  const dataObj = payload?.data ?? null;
  const dataId = dataObj?.id ?? null;
  const dataUserId = dataObj?.user?.id ?? null;

  const id = directId ?? userId ?? dataId ?? dataUserId ?? null;

  // Prefer a concrete user object if present; otherwise treat the payload itself as user
  const user =
    (userObj && userId != null ? userObj : null) ??
    (dataObj && (dataId != null || dataUserId != null) ? dataObj.user ?? dataObj : null) ??
    (directId != null ? payload : null);

  return { user, id };
}

// Try importing the /api/me route handler and calling it directly
async function callMeHandlerDirect(req: NextRequest): Promise<any | null> {
  try {
    // Lazy import to avoid circular import issues in dev
    const mod = await import('@/app/api/me/route');
    const meGET = mod?.GET as (r: NextRequest) => Promise<Response>;
    if (typeof meGET !== 'function') return null;

    const resp = await meGET(req);
    if (!resp?.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// Resolve the current user by calling /api/me without relying on external networking
export async function getCurrentUser(req: NextRequest): Promise<CurrentUser | null> {
  // 1) Prefer direct route invocation (no network)
  const direct = await callMeHandlerDirect(req);
  if (direct) {
    const { user, id } = extractUserAndId(direct);
    if (id != null) return (user ?? direct) as CurrentUser;
  }

  // 2) Fallback to a same-origin fetch if direct call is unavailable
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

    const { user, id } = extractUserAndId(data);
    if (id == null) return null;

    return (user ?? data) as CurrentUser;
  } catch {
    return null;
  }
}