# Complete Application Testing Flow

## 1. Authentication Testing
### Sign Up Flow
- [ ] Test direct registration with email/password
- [ ] Test OAuth registration (Google, GitHub, LinkedIn)
- [ ] Verify user creation in PostgreSQL database
- [ ] Check Redis sync for new user data
- [ ] Confirm initial credit allocation

### Login Flow
- [ ] Test direct login with credentials
- [ ] Test OAuth login flows
- [ ] Verify session persistence
- [ ] Check authentication callbacks

## 2. Redis Synchronization Testing
### User Data Sync
- [ ] Create new user and verify Redis cache update
- [ ] Update user credits and check Redis sync
- [ ] Test API key creation and Redis registration

### API Key Management
- [ ] Create API key and verify Redis sync
- [ ] Deactivate API key and check Redis update
- [ ] Test API key lookup from Redis cache

## 3. API Connection Testing
### External API Health Checks
- [ ] Test PG_API connection (`/api/health/external`)
- [ ] Test REDIS_API connection 
- [ ] Test BG_Public_API connection
- [ ] Verify API gateway integration

### BigQuery Service Testing
- [ ] Test BigQuery connection component
- [ ] Verify API analytics service communication
- [ ] Check environment variable configuration

## 4. Credit Management for BQ_Public_API
### Credit Operations
- [ ] Purchase credit bundles via Stripe/PayPal
- [ ] Verify credit updates in PostgreSQL
- [ ] Check Redis cache synchronization
- [ ] Test credit deduction for API usage

### Credit Monitoring
- [ ] Test low credit warnings
- [ ] Verify credit balance displays
- [ ] Check transaction history

## 5. API Usage Reporting
### Usage Tracking
- [ ] Make API calls and verify usage recording
- [ ] Check credit deduction per API call
- [ ] Test usage analytics display
- [ ] Verify BigQuery integration for usage stats

### Analytics Dashboard
- [ ] Test daily usage charts
- [ ] Check endpoint usage breakdown
- [ ] Verify credit usage pie charts
- [ ] Test date range filtering

## 6. Integration Flow Testing
### Complete User Journey
1. User signs up → PostgreSQL record + Redis sync
2. User creates API key → Redis registration
3. User purchases credits → Stripe/PayPal → PostgreSQL + Redis update
4. API calls made → BigQuery validation → Credit deduction → Usage recording
5. Usage analytics → Data aggregation → Dashboard display

### Error Handling
- [ ] Test expired API keys
- [ ] Test insufficient credits
- [ ] Test API service outages
- [ ] Verify graceful error messaging

## Testing URLs (Once Deployed)
- Authentication: `/login`, `/register`, `/auth/callback`
- Dashboard: `/dashboard`
- API Keys: `/api-keys`
- Credits: `/credits`
- Analytics: `/api-usage`
- Connection Tests: `/api-connection-test`
- Health Checks: `/api/health/external`

## Critical Environment Variables to Verify
- `PG_API_URL` - PostgreSQL API service
- `REDIS_API_URL` - Redis cache service  
- `INTERNAL_API_TOKEN` - Inter-service authentication
- `JWT_SECRET` - Session management
- OAuth credentials (Google, GitHub, LinkedIn)
- Payment gateway credentials (Stripe, PayPal)