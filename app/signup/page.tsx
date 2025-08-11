'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      await signIn('credentials', { email: form.email, password: form.password, callbackUrl: '/' });
    } else {
      const msg = await res.json().catch(() => ({}));
      alert(msg?.error || 'Signup failed');
    }
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', display: 'grid', gap: 12 }}>
      <h1>Sign up</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
        <input placeholder="First name" value={form.firstName} onChange={e=>setForm({...form, firstName: e.target.value})} />
        <input placeholder="Last name" value={form.lastName} onChange={e=>setForm({...form, lastName: e.target.value})} />
        <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
        <input placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} />
        <button type="submit" disabled={busy}>Create account</button>
      </form>
      <hr />
      <button onClick={() => signIn('google', { callbackUrl: '/' })}>Continue with Google</button>
      <button onClick={() => signIn('github', { callbackUrl: '/' })}>Continue with GitHub</button>
    </div>
  );
}