import { pool } from '@/lib/db';
import { Plans, PlanSlug } from '@/lib/planConfig';

export function currentPeriodStartUTC(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const first = new Date(Date.UTC(y, m, 1));
  return first.toISOString().slice(0, 10);
}

export type BlockedReason = 'quota_exceeded' | 'community_contact_sales';

export interface UsageStatus {
  plan: PlanSlug;
  periodStart: string;
  used: number;
  overage_used: number;
  quota: number;
  remaining: number;
  allowOverage: boolean;
  blockedReason?: BlockedReason | null;
}

async function getUserPlanAndCheckCommunity(userId: number): Promise<{ plan: PlanSlug; blockedReason?: BlockedReason | null }> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT plan_slug, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );
    const row = rows[0];
    const plan: PlanSlug = (row?.plan_slug || 'community') as PlanSlug;
    if (plan !== 'community') return { plan, blockedReason: null };

    const createdAt = row?.created_at ? new Date(row.created_at) : new Date();
    const now = new Date();
    const monthsActive = (now.getUTCFullYear() - createdAt.getUTCFullYear()) * 12 + (now.getUTCMonth() - createdAt.getUTCMonth());
    if (monthsActive >= 3) {
      return { plan, blockedReason: 'community_contact_sales' };
    }
    return { plan, blockedReason: null };
  } finally {
    client.release();
  }
}

export async function getOrInitUsage(userId: number): Promise<UsageStatus> {
  const periodStart = currentPeriodStartUTC();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO user_usage_monthly (user_id, period_start, used, overage_used)
       VALUES ($1, $2, 0, 0)
       ON CONFLICT (user_id, period_start) DO NOTHING`,
      [userId, periodStart]
    );

    const { plan, blockedReason } = await getUserPlanAndCheckCommunity(userId);
    const { rows } = await client.query(
      `SELECT used, overage_used FROM user_usage_monthly WHERE user_id = $1 AND period_start = $2`,
      [userId, periodStart]
    );
    const used = rows[0]?.used ?? 0;
    const overage_used = rows[0]?.overage_used ?? 0;
    const quota = Plans[plan].monthlyQuota;
    const remaining = Math.max(quota - used, 0);

    await client.query('COMMIT');

    return {
      plan,
      periodStart,
      used,
      overage_used,
      quota,
      remaining,
      allowOverage: Plans[plan].allowOverage,
      blockedReason: blockedReason || null,
    };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function debitQuery(userId: number, cost = 1): Promise<UsageStatus> {
  const periodStart = currentPeriodStartUTC();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO user_usage_monthly (user_id, period_start, used, overage_used)
       VALUES ($1, $2, 0, 0)
       ON CONFLICT (user_id, period_start) DO NOTHING`,
      [userId, periodStart]
    );

    const { plan, blockedReason } = await getUserPlanAndCheckCommunity(userId);
    if (blockedReason) {
      await client.query('ROLLBACK');
      const quota = Plans[plan].monthlyQuota;
      return {
        plan,
        periodStart,
        used: 0,
        overage_used: 0,
        quota,
        remaining: 0,
        allowOverage: Plans[plan].allowOverage,
        blockedReason,
      };
    }

    const planCfg = Plans[plan];

    const cur = await client.query(
      `SELECT used, overage_used FROM user_usage_monthly WHERE user_id = $1 AND period_start = $2 FOR UPDATE`,
      [userId, periodStart]
    );
    let used = cur.rows[0]?.used ?? 0;
    let overage_used = cur.rows[0]?.overage_used ?? 0;

    const quota = planCfg.monthlyQuota;
    const newUsed = used + cost;

    if (!planCfg.allowOverage && newUsed > quota) {
      await client.query('ROLLBACK');
      return {
        plan,
        periodStart,
        used,
        overage_used,
        quota,
        remaining: Math.max(quota - used, 0),
        allowOverage: false,
        blockedReason: 'quota_exceeded',
      };
    }

    if (planCfg.allowOverage && newUsed > quota) {
      const deltaOver = newUsed - Math.max(quota, used);
      overage_used += deltaOver;
    }

    used = newUsed;

    await client.query(
      `UPDATE user_usage_monthly
         SET used = $3, overage_used = $4
       WHERE user_id = $1 AND period_start = $2`,
      [userId, periodStart, used, overage_used]
    );

    await client.query('COMMIT');

    return {
      plan,
      periodStart,
      used,
      overage_used,
      quota,
      remaining: Math.max(quota - used, 0),
      allowOverage: planCfg.allowOverage,
      blockedReason: null,
    };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}