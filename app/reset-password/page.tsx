"use client";
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const e = params.get('email');
    if (e) setEmail(e);
  }, [params]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!token) return setErr('Missing reset token');
    if (!email) return setErr('Missing email');
    if (!password || password.length < 8) return setErr('Password must be at least 8 characters');
    if (password !== confirm) return setErr("Passwords don't match");
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Reset failed');
      setMsg('Password updated. You can now log in.');
      setTimeout(() => router.push('/login'), 1200);
    } catch (e: any) {
      setErr(e?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 bg-white dark:bg-gray-900 rounded-lg shadow p-6">
      <h1 className="text-2xl font-semibold mb-4">Reset Password</h1>
      {msg && <div className="mb-3 text-green-600">{msg}</div>}
      {err && <div className="mb-3 text-red-600">{err}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="w-full input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" required />
        <input className="w-full input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" type="password" required />
        <input className="w-full input" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm password" type="password" required />
        <button disabled={loading} className="w-full py-2 px-4 bg-blue-600 text-white rounded disabled:opacity-50">{loading ? 'Updating…' : 'Update password'}</button>
      </form>
    </div>
  );
}
