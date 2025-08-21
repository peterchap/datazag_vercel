'use client';

export const dynamic = 'force-dynamic'; // login page uses auth client hooks
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        callbackUrl: '/',
        redirect: false,
      });
      if (res?.error) {
        setError(res.error);
      } else if (res?.ok) {
        // Give next-auth a tick to hydrate session
        setTimeout(() => {
          const force = (session as any)?.user?.forcePasswordReset;
          if (force) {
            window.location.href = `/reset-password?email=${encodeURIComponent(email)}`;
          } else {
            window.location.href = '/';
          }
        }, 200);
      }
    } catch (err: any) {
      setError('Login failed');
    }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto mt-16 bg-white rounded-lg shadow-lg p-8 dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-8 text-center">Login</h1>
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <div className="mt-6 flex flex-col gap-2">
        <button
          className="w-full py-2 px-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-50"
          onClick={() => signIn('google', { callbackUrl: '/' })}
          disabled={loading || !(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_GOOGLE_CLIENT_ID)}
          title={!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_GOOGLE_CLIENT_ID) ? 'Google OAuth not configured' : undefined}
        >
          Sign in with Google
        </button>
        <p className="text-sm text-center mt-4 text-gray-700 dark:text-gray-300">
          Don’t have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}