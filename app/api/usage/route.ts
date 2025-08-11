import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { getOrInitUsage } from '@/lib/usage';
import { Plans } from '@/lib/planConfig';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const usage = await getOrInitUsage(Number(user.id));
  const plan = Plans[usage.plan];
  
  return NextResponse.json({
    plan: {
      slug: usage.plan,
      label: plan.label,
      monthlyQuota: plan.monthlyQuota,
      allowOverage: plan.allowOverage,
      overagePerThousandCents: plan.overagePerThousandCents,
    },
    usage: {
      periodStart: usage.periodStart,
      used: usage.used,
      overage_used: usage.overage_used,
      remaining: usage.remaining,
    },
    blockedReason: usage.blockedReason,
  });
}