import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { debitQuery } from '@/lib/usage';

export function withCredits<T extends (req: NextRequest) => Promise<NextResponse>>(handler: T, cost = 1) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const user = await getCurrentUser(req);
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const debit = await debitQuery(Number(user.id), cost);
    if (debit.blockedReason) {
      const contactSalesUrl = process.env.NEXT_PUBLIC_CONTACT_SALES_URL || '/pricing';
      if (debit.blockedReason === 'community_contact_sales') {
        const reason = 'Your free Community plan has reached the 3-month limit. Please contact sales to continue.';
        return NextResponse.json(
          { error: 'Plan limit reached', reason, plan: debit.plan, quota: debit.quota, used: debit.used, contactSalesUrl },
          { status: 402 }
        );
      }
      const reason = 'Monthly quota exceeded. Please upgrade.';
      return NextResponse.json(
        { error: 'Quota exceeded', reason, plan: debit.plan, quota: debit.quota, used: debit.used },
        { status: 402 }
      );
    }

    return handler(req);
  };
}