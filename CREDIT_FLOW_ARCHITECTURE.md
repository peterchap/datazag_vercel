# Credit Purchase and Usage Flow Architecture

## Overview
This document describes the credit management flow between the Public API, Customer Portal, PostgreSQL, and Redis systems.

## System Components

### 1. Public API (BG_Query_API)
- **Role**: Processes BigQuery requests from users
- **Redis Access**: Reads API key validation and current credit balance
- **Usage Reporting**: Reports usage counts to Customer Portal

### 2. Customer Portal (Source of Truth)
- **Role**: Central management system for users, credits, and API keys
- **Database**: PostgreSQL (authoritative data store)
- **Redis Sync**: Updates Redis with credit changes

### 3. Redis Cache
- **Role**: High-speed cache for API key validation and credit checks
- **Data**: API key → user mapping, current credit balances
- **Updated By**: Customer Portal only

### 4. PostgreSQL Database
- **Role**: Persistent storage and source of truth
- **Tables**: users, api_keys, api_usage, credit_transactions

## Credit Usage Flow

### Step 1: API Request Processing
```
User → Public API Request
Public API → Redis: Check API key + credits
Redis → Public API: Valid key + sufficient credits
Public API → Process BigQuery request
```

### Step 2: Usage Reporting
```
Public API → Customer Portal: POST /api/usage/report
{
  "userId": 123,
  "apiKeyId": 456, 
  "creditsUsed": 5,
  "queryType": "standard",
  "metadata": { ... }
}
```

### Step 3: Credit Deduction & Sync
```
Customer Portal → PostgreSQL: Store usage record
Customer Portal → PostgreSQL: Deduct credits from user balance
Customer Portal → Redis: Update cached credit balance
Customer Portal → Public API: Return remaining credits
```

## Benefits of This Architecture

1. **Performance**: Redis provides fast API validation
2. **Consistency**: PostgreSQL maintains authoritative data
3. **Reliability**: Usage reporting ensures credits are properly tracked
4. **Auditability**: All transactions stored in PostgreSQL
5. **Real-time**: Redis cache updated immediately after usage

## API Endpoints

### Customer Portal
- `POST /api/usage/report` - Receive usage from public API
- `GET /api/users/{id}/credits` - Get current credit balance
- `POST /api/credits/purchase` - Add credits via payment

### Public API Integration
- Reports usage counts (not revised totals)
- Portal calculates and manages credit deductions
- Redis cache updated by portal only

## Credit Purchase Flow
```
User → Stripe Payment → Customer Portal
Customer Portal → PostgreSQL: Add credits
Customer Portal → Redis: Update cached balance
Customer Portal → User: Purchase confirmation
```