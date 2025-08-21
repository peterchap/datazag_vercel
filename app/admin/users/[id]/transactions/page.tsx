"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import AdminLayout from '@/components/admin-layout';

export default function UserTransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [userName, setUserName] = useState<string>('');
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ures = await fetch(`/api/admin/users/${id}`, { cache: 'no-store' });
        if (ures.ok) {
          const ujson = await ures.json();
          const name = [ujson.firstName, ujson.lastName].filter(Boolean).join(' ') || ujson.username || ujson.email;
          if (alive) setUserName(name);
        }
        const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (start) qs.set('start', start);
        if (end) qs.set('end', end);
        const res = await fetch(`/api/admin/users/${id}/transactions?${qs.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load transactions');
        const json = await res.json();
        if (alive) {
          setData(json?.data || []);
          setTotal(json?.total || 0);
        }
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load transactions');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, page, pageSize, start, end]);

  return (
    <AdminLayout title={`Transactions · ${userName || 'User #' + id}`} description="View transactions for this user">
      <div className="mb-4">
        <div className="border-b mb-2">
          <nav className="flex gap-4 text-sm">
            <button className="pb-2" onClick={() => router.push(`/admin/users/${id}/api-keys`)}>API Keys</button>
            <button className="pb-2 border-b-2 border-primary" onClick={() => router.push(`/admin/users/${id}/transactions`)}>Transactions</button>
            <button className="pb-2" onClick={() => router.push(`/admin/users/${id}/api-usage`)}>API Usage</button>
          </nav>
        </div>
        <h1 className="text-xl font-semibold">Transactions for {userName || `User #${id}`}</h1>
      </div>
      {error && <div className="text-red-600 mb-3">{error}</div>}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex flex-col">
          <label className="text-xs mb-1">Start</label>
          <input type="datetime-local" className="border rounded px-2 py-1 text-sm" value={start} onChange={e => { setPage(1); setStart(e.target.value); }} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs mb-1">End</label>
          <input type="datetime-local" className="border rounded px-2 py-1 text-sm" value={end} onChange={e => { setPage(1); setEnd(e.target.value); }} />
        </div>
        <button className="border rounded px-3 py-1 text-sm" onClick={() => { setStart(''); setEnd(''); }}>Clear</button>
      </div>
  {loading ? 'Loading…' : (
        <>
          <div className="overflow-auto rounded border">
            <table className="min-w-[700px] w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3">{t.type}</td>
                    <td className="p-3">{t.amount}</td>
                    <td className="p-3">{t.description}</td>
                    <td className="p-3">{t.status}</td>
                    <td className="p-3">{t.createdAt ? format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm') : '-'}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 gap-3">
            <div className="text-sm text-muted-foreground">Total: {total}</div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Page size</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={pageSize}
                onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
              >
                {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="border rounded px-2 py-1 text-sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
              <div className="text-sm">Page {page} / {Math.max(1, Math.ceil(total / pageSize))}</div>
              <button className="border rounded px-2 py-1 text-sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
