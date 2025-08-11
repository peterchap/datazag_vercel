-- Add billing and subscription fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS plan_slug TEXT DEFAULT 'community',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS subscription_price_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create monthly usage tracking table
CREATE TABLE IF NOT EXISTS user_usage_monthly (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL, -- YYYY-MM-DD format for calendar month
  used INTEGER NOT NULL DEFAULT 0,
  overage_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_usage_monthly_user_period ON user_usage_monthly (user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_plan_slug ON users (plan_slug);

-- Update existing users to have password_hash if they have password
UPDATE users 
SET password_hash = password 
WHERE password_hash IS NULL AND password IS NOT NULL;