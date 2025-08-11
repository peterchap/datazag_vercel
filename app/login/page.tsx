'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await signIn('credentials', { email, password, callbackUrl: '/' });
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', display: 'grid', gap: 12 }}>
      <h1>Login</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit" disabled={busy}>Sign in</button>
      </form>
      <hr />
      <button onClick={() => signIn('google', { callbackUrl: '/' })}>Continue with Google</button>
      <button onClick={() => signIn('github', { callbackUrl: '/' })}>Continue with GitHub</button>
      <p>Don't have an account? <Link href="/signup">Sign up</Link></p>
    </div>
  );
}