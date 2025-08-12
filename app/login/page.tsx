'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        window.location.href = '/'; // Redirect after login
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
          className="w-full py-2 px-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700"
          onClick={() => signIn('google', { callbackUrl: '/' })}
          disabled={loading}
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