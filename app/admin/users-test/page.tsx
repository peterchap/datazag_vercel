'use client'

import { useEffect, useState, type CSSProperties } from 'react'

type UserRow = {
	id: number
	firstName: string | null
	lastName: string | null
	email: string | null
	company: string | null
	role: string | null
	credits: number | null
}

export default function Page() {
	const [data, setData] = useState<UserRow[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [sortKey, setSortKey] = useState<'name' | 'company' | null>(null)
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

	useEffect(() => {
		let alive = true
		;(async () => {
			try {
				const res = await fetch('/api/admin/users', { cache: 'no-store' })
				if (!res.ok) {
					const text = await res.text()
					throw new Error(`HTTP ${res.status} ${res.statusText} ${text || ''}`.trim())
				}
				const json = await res.json()
				if (alive) setData(Array.isArray(json) ? json : [])
			} catch (e: any) {
				if (alive) setError(e?.message || 'Failed to load users')
			} finally {
				if (alive) setLoading(false)
			}
		})()
		return () => {
			alive = false
		}
	}, [])

	const toggleSort = (key: 'name' | 'company') => {
		if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
		else {
			setSortKey(key)
			setSortDir('asc')
		}
	}

	const sorted = (() => {
		const arr = [...data]
		if (!sortKey) return arr
		const getName = (u: UserRow) => `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim().toLowerCase()
		const getCompany = (u: UserRow) => (u.company ?? '').toLowerCase()
		arr.sort((a, b) => {
			const av = sortKey === 'name' ? getName(a) : getCompany(a)
			const bv = sortKey === 'name' ? getName(b) : getCompany(b)
			const c = av.localeCompare(bv)
			return sortDir === 'asc' ? c : -c
		})
		return arr
	})()

	return (
		<div style={{ padding: 16 }}>
			<h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Users — test table</h1>
			<p style={{ color: '#666', marginBottom: 16 }}>Shows first/last name, email, company, role, credits.</p>

			{error && (
				<div style={{ padding: 12, background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', marginBottom: 12 }}>
					{error}
				</div>
			)}
			{loading ? (
				<div>Loading…</div>
			) : data.length === 0 ? (
				<div>No users found.</div>
			) : (
				<div style={{ overflowX: 'auto' }}>
					<table style={{ width: '100%', borderCollapse: 'collapse' }}>
						<thead>
							<tr>
								<th style={th}>
									<button style={thBtn} onClick={() => toggleSort('name')}>
										Name {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
									</button>
								</th>
								<th style={th}>Email</th>
								<th style={th}>
									<button style={thBtn} onClick={() => toggleSort('company')}>
										Company {sortKey === 'company' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
									</button>
								</th>
								<th style={th}>Role</th>
								<th style={th}>Credits</th>
							</tr>
						</thead>
						<tbody>
							{sorted.map((u) => (
								<tr key={u.id}>
									<td style={td}>{`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()}</td>
									<td style={td}>{u.email ?? ''}</td>
									<td style={td}>{u.company ?? ''}</td>
									<td style={td}>{u.role ?? ''}</td>
									<td style={td}>{u.credits ?? ''}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}

const th: CSSProperties = {
	textAlign: 'left',
	borderBottom: '1px solid #e5e7eb',
	padding: '8px 12px',
	fontWeight: 600,
}

const td: CSSProperties = {
	borderBottom: '1px solid #f3f4f6',
	padding: '8px 12px',
}

const thBtn: CSSProperties = {
	all: 'unset',
	cursor: 'pointer',
	display: 'inline-flex',
	gap: 6,
}

