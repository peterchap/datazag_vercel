# Environment Variables for Authentication and Billing

## Required Environment Variables

### NextAuth Configuration
```bash
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://your-domain.com
```

### Database
```bash
DATABASE_URL=postgres://user:password@host:port/database?ssl=true
```

### OAuth Providers
```bash
# Google OAuth
OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth  
OAUTH_GITHUB_CLIENT_ID=your-github-client-id
OAUTH_GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Stripe Configuration
```bash
STRIPE_SECRET_KEY=sk_test_or_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PRICE_ID=price_your_default_price_id

# Plan-specific pricing (optional, for multi-plan support)
STRIPE_PRICE_PRO=price_pro_plan_id
STRIPE_PRICE_BUSINESS=price_business_plan_id  
STRIPE_PRICE_ENTERPRISE=price_enterprise_plan_id
```

### Usage Configuration (optional)
```bash
# Pro plan overage cost in cents per 1,000 calls (default: 150 = $1.50)
OVERAGE_PRO_PER_1000_CENTS=150

# Contact sales URL for community plan limits (default: /pricing)
NEXT_PUBLIC_CONTACT_SALES_URL=https://calendly.com/your-sales-team
```

## Database Migration

Before running the application, execute the SQL migration:

```sql
-- Run this against your PostgreSQL database
\i sql/add_auth_billing_schema.sql
```

Or manually execute the commands in `sql/add_auth_billing_schema.sql`.

## Stripe Webhook Configuration

1. In Stripe Dashboard, create a webhook endpoint pointing to: `https://your-domain.com/api/stripe/webhook`
2. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## OAuth Provider Setup

### Google
1. Go to Google Cloud Console
2. Create OAuth2 credentials
3. Add authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`

### GitHub
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth app
3. Set Authorization callback URL: `https://your-domain.com/api/auth/callback/github`

## Testing the Implementation

1. Visit `/login` - should show all three login options (credentials, Google, GitHub)
2. Visit `/signup` - should allow creating new accounts with email/password
3. Visit `/billing` - should show subscription management options
4. Visit `/api/usage` - should return current user's plan and usage information

## API Endpoints Added

- `POST /api/auth/signup` - Create new user account
- `GET /api/me` - Get current user session info
- `GET /api/usage` - Get user's plan and usage stats
- `POST /api/stripe/checkout` - Create subscription checkout session
- `POST /api/stripe/portal` - Create billing portal session
- `POST /api/stripe/webhook` - Handle Stripe webhook events

## Usage Middleware

Use `withCredits` to wrap API endpoints that should be metered:

```typescript
import { withCredits } from '@/lib/withCredits';

export const GET = withCredits(async (req: NextRequest) => {
  // Your API logic here
  return NextResponse.json({ result: 'success' });
}, 1); // Cost: 1 credit per call
```