# API Keys Management

This document describes the admin-only API key management endpoints for the DataZag portal.

## Authentication

All API key management endpoints require admin authentication via the `X-Admin-Secret` header. This header must match the `ADMIN_API_SECRET` environment variable.

```
X-Admin-Secret: your-secret-admin-key
```

## CORS Configuration

API key endpoints have strict CORS policies. Requests are only allowed from:

- `https://portal.datazag.com`
- `http://localhost:3000`
- `https://datazag-vercel.vercel.app`
- `https://datazag-vercel-datazag.vercel.app`
- `https://datazag-vercel-git-master-datazag.vercel.app`

Server-to-server requests (without an `Origin` header) bypass CORS restrictions.

## Endpoints

### POST /api/api-keys

Creates a new API key for a specified user.

**Headers:**
- `X-Admin-Secret`: Required admin secret
- `Content-Type: application/json`

**Request Body:**
```json
{
  "userId": "user-id-string",
  "name": "optional-key-name"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "API key created successfully",
  "key": {
    "id": 123,
    "key": "datazag_abc123...",
    "name": "My API Key",
    "active": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "credits": 1000
  }
}
```

### GET /api/api-keys

Retrieves all API keys or keys for a specific user.

**Headers:**
- `X-Admin-Secret`: Required admin secret

**Query Parameters:**
- `userId` (optional): Filter keys for a specific user

**Response (200 OK):**
```json
{
  "success": true,
  "keys": [
    {
      "id": 123,
      "key": "datazag_abc123...",
      "name": "My API Key",
      "active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "user_email": "user@example.com",
      "user_credits": 1000
    }
  ]
}
```

### DELETE /api/api-keys/:id

Deletes an API key by ID. Admin can delete any key without ownership constraints.

**Headers:**
- `X-Admin-Secret`: Required admin secret

**URL Parameters:**
- `id`: The numeric ID of the API key to delete

**Response (200 OK):**
```json
{
  "success": true,
  "message": "API key deleted successfully",
  "deleted_key": {
    "id": 123,
    "name": "My API Key"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "API key not found"
}
```

## Error Responses

### 401 Unauthorized
Missing or invalid `X-Admin-Secret` header:
```json
{
  "success": false,
  "error": "Unauthorized - Invalid admin secret"
}
```

### 403 Forbidden  
Request from disallowed origin:
```json
{
  "success": false,
  "error": "Origin not allowed"
}
```

### 400 Bad Request
Invalid request data:
```json
{
  "success": false,
  "error": "userId is required"
}
```

### 500 Internal Server Error
Server configuration or database error:
```json
{
  "success": false,
  "error": "Internal server error",
  "details": "Error details..."
}
```

## Environment Configuration

Set the following environment variable:

```bash
ADMIN_API_SECRET=your-secure-admin-secret-key
```

## Notes

- The Public API should NOT write to the Neon database
- Public API will only report usage to the portal's usage endpoint
- Generated API keys use the format: `datazag_[64-character-hex-string]`
- All timestamps are in ISO 8601 format (UTC)
- Redis sync has been removed from this implementation