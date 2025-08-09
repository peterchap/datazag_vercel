-- Run once on Neon (us-east-1)
CREATE TABLE IF NOT EXISTS usage_events (
  id SERIAL PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  delta INTEGER NOT NULL,
  endpoint TEXT,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_id TEXT,
  meta JSONB
);

CREATE TABLE IF NOT EXISTS usage_counters (
  api_key TEXT PRIMARY KEY,
  credits_used BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_usage_events_api_key_ts ON usage_events (api_key, ts DESC);