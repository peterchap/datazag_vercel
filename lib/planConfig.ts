export type PlanSlug = 'community' | 'pro' | 'business' | 'enterprise';

export interface Plan {
  slug: PlanSlug;
  label: string;
  monthlyQuota: number;
  allowOverage: boolean;
  overagePerThousandCents?: number;
  features: string[];
}

function intFromEnv(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const Plans: Record<PlanSlug, Plan> = {
  community: {
    slug: 'community',
    label: 'Community',
    monthlyQuota: 1000,
    allowOverage: false,
    features: [
      'Checks mailability and trustworthiness',
      'No rate limiting',
      'Community & Docs Support',
      'Non-commercial projects and commercial testing only',
      'Free for 3 months; contact sales to continue',
    ],
  },
  pro: {
    slug: 'pro',
    label: 'Pro',
    monthlyQuota: 20000,
    allowOverage: true,
    overagePerThousandCents: intFromEnv('OVERAGE_PRO_PER_1000_CENTS', 150),
    features: [
      'Everything in Community plus',
      'Auto renewal',
      'Automatic pro-rata overage to prevent disruption in service',
      'Email & chat Support',
      'For commercial projects',
    ],
  },
  business: {
    slug: 'business',
    label: 'Business',
    monthlyQuota: 150000,
    allowOverage: false,
    features: [
      'Core real-time data (Current Whois & DNS)',
      'Basic Risk Score',
      'Phishing & Malware Flags',
      'Community & Docs Support',
      'For commercial projects',
    ],
  },
  enterprise: {
    slug: 'enterprise',
    label: 'Enterprise',
    monthlyQuota: 100000,
    allowOverage: false,
    features: [
      'Core real-time data (Current Whois & DNS)',
      'Basic Risk Score',
      'Phishing & Malware Flags',
      'Community & Docs Support',
      'For commercial projects',
    ],
  },
};

export const PriceToPlan: Record<string, PlanSlug> = {
  [process.env.STRIPE_PRICE_PRO || '']: 'pro',
  [process.env.STRIPE_PRICE_BUSINESS || '']: 'business',
  [process.env.STRIPE_PRICE_ENTERPRISE || '']: 'enterprise',
};