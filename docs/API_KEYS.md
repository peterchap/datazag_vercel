# API Keys Management

This document describes two ways to manage API keys in the portal:

1. Portal endpoints (session-based, recommended for the UI)
2. Admin-only endpoints (server-to-server, protected by an admin secret with strict CORS)

## 1) Portal Endpoints (Session-Based)

These routes are meant to be called by the portal UI. They run server-side, use the logged-in session to identify the user, and talk directly to Neon.

- GET `/api/api-keys`  
  Lists the current user's API keys.
- POST `/api/api-keys`  
  Creates a new API key for the current user.
  - Body:
    ```json
    { "name": "My API Key" }
    ```
- DELETE `/api/api-keys/:id`  
  Deletes the specified API key if it belongs to the current user.

Auth: Session cookie (credentials: include). No `X-Admin-Secret` required or used.  
CORS: Not applicable for same-origin use in the portal UI.

Response shapes:

```json
// GET
{
  "success": true,
  "keys": [
    {
      "id": 123,
      "key": "datazag_abc123...",
      "name": "My API Key",
      "active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}

// POST
{
  "success": true,
  "key": {
    "id": 123,
    "key": "datazag_abc123...",
    "name": "My API Key",
    "active": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}

// DELETE
{
  "success": true,
  "message": "API key deleted successfully",
  "deleted_key": { "id": 123, "name": "My API Key" }
}
```

## 2) Admin-Only Endpoints (Server-to-Server)

These are designed for back-office or other services to manage keys across any user.

- POST `/admin/api-keys`  
  Creates a key for a specified user.
  - Headers:
    - `X-Admin-Secret: your-admin-secret`
  - Body:
    ```json
    { "userId": "user-id", "name": "Key name" }
    ```
- GET `/admin/api-keys?userId=...`  
  Lists all keys, optionally filtered by `userId`.
- DELETE `/admin/api-keys/:id`  
  Deletes a key by ID.

Auth: `X-Admin-Secret` must match `ADMIN_API_SECRET`.  
CORS: Strictly allow-listed. Server-to-server calls without an `Origin` header are allowed.

## Notes

- Schema used by these routes expects `api_keys` table with columns:
  - `id`, `user_id`, `api_key`, `key_name`, `is_active`, `created_at`, `updated_at`
- Keys are generated with the `datazag_` prefix and 32-byte random hex.
