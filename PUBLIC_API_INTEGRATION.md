# Public API Integration Guide

## Credit Usage Flow Implementation

The Customer Portal now has endpoints ready for the Public API to integrate credit usage tracking.

### For Public API Developers

#### 1. Usage Reporting Endpoint
```
POST https://your-portal-domain.com/api/usage/report
Content-Type: application/json

{
  "userId": 123,
  "creditsUsed": 5,
  "queryType": "standard",
  "metadata": {
    "apiKeyId": 456,
    "queryComplexity": "medium",
    "rowsProcessed": 1000
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Usage recorded successfully",
  "remainingCredits": 995
}
```

#### 2. Credit Check Endpoint
```
GET https://your-portal-domain.com/api/credits/123

Response:
{
  "success": true,
  "userId": 123,
  "credits": 1000
}
```

### Integration Steps for Public API

1. **Before Processing Request:**
   - Validate API key via Redis
   - Check credit balance via Redis
   - Proceed if sufficient credits

2. **After Processing Request:**
   - Calculate credits used
   - Report usage to Customer Portal
   - Portal will update Redis automatically

3. **Error Handling:**
   - If reporting fails, log for retry
   - Portal maintains transaction consistency

### Redis Data Structure

The Customer Portal manages Redis with:
- API Key → User ID mapping
- User ID → Credit balance
- Real-time credit updates

### Benefits

1. **Performance**: Redis provides fast lookups
2. **Consistency**: Portal manages all credit deductions
3. **Auditability**: All usage stored in PostgreSQL
4. **Reliability**: Portal handles Redis sync automatically

### Example Public API Flow

```python
# 1. Validate API key and check credits (Redis)
user_data = redis.get(f"api_key:{api_key}")
if not user_data or user_data['credits'] < required_credits:
    return error("Insufficient credits")

# 2. Process BigQuery request
result = process_bigquery_request(query)

# 3. Report usage to Customer Portal
usage_data = {
    "userId": user_data['user_id'],
    "creditsUsed": calculate_credits(result),
    "queryType": "bigquery",
    "metadata": {
        "rowsProcessed": result.total_rows,
        "queryComplexity": analyze_complexity(query)
    }
}
requests.post("https://portal.com/api/usage/report", json=usage_data)
```

This architecture ensures the Customer Portal remains the authoritative source for credit management while providing high-performance API access through Redis caching.