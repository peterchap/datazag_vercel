'use client';
import { useState } from 'react';

export default function BillingPage() {
  const [loading, setLoading] = useState(false);

  async function goToCheckout() {
    setLoading(true);
    const res = await fetch('/api/stripe/checkout', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setLoading(false);
  }
  async function goToPortal() {
    setLoading(true);
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto' }}>
      <h1>Billing</h1>
      <p>Manage your subscription.</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={goToCheckout} disabled={loading}>Subscribe</button>
        <button onClick={goToPortal} disabled={loading}>Open Billing Portal</button>
      </div>
    </div>
  );
}