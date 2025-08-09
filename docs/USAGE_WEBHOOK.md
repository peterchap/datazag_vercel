# Usage Webhook (/usage)

The public API reports usage to the portal:

- POST https://portal.datazag.com/usage

Authentication:
- HMAC SHA-256 over the raw JSON body
- Header: `x-signature: <hex>`
- Shared secret: `USAGE_WEBHOOK_SECRET`

Idempotency:
- Header: `x-idempotency-key: <stable-per-request>`
- Duplicate keys are ignored safely.

Example payload:
```json
{
  "apiKey": "key_123",
  "delta": 5,
  "endpoint": "/v1/search",
  "ts": 1710000000000,
  "requestId": "req_abc",
  "meta": { "plan": "pro" }
}
```

Environment variables (Vercel - portal):
- `DATABASE_URL` — Neon pooled connection string (us-east-1)
- `USAGE_WEBHOOK_SECRET` — shared with the Public API

Public API config (e.g., Cloud Run):
- `PORTAL_USAGE_URL` — https://portal.datazag.com/usage
- `USAGE_WEBHOOK_SECRET` — same value as above

Optional same-origin proxy for Neon API:
- Requests to `/apipg/*` are forwarded to `https://apipg.datazag.com/*` via `vercel.json`.

Notes:
- Keep `/usage` fast: verify HMAC + idempotency, upsert stats, return 200. Heavy processing can be async elsewhere.
- Monitor and alert on signature failures or abnormal deltas.