# API Gateway for Firebase & PostgreSQL Integration

This API gateway creates a secure layer between your Firebase-hosted frontend and your PostgreSQL database on your cloud server. It provides authenticated endpoints for all the functionality needed by your customer portal application.

## Features

- **Secure Authentication**: JWT-based authentication for frontend users
- **Protected Endpoints**: All sensitive data operations require authentication
- **CORS Protection**: Only allows requests from your approved domains
- **Rate Limiting**: Prevents API abuse
- **Database Connection Pooling**: Efficient database access

## Setup Instructions

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database running on your cloud server
- Firebase hosting for your frontend

### Installation

1. Copy this directory to your cloud server
2. Create a `.env` file based on the provided `.env.example`
3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### Environment Variables

Be sure to set these variables in your `.env` file:

- `PORT`: The port the server will run on (default: 3000)
- `JWT_SECRET`: A secure secret for signing JWTs
- `API_SERVICE_KEY`: Key for internal service-to-service authentication
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend domains
- `DATABASE_URL`: PostgreSQL connection string

## Endpoints Reference

### Authentication

- `POST /api/login`: Authenticates a user and returns a JWT
  - Body: `{ "email": "user@example.com", "password": "password" }`

### User Management

- `GET /api/user`: Get authenticated user info (requires auth)
- `PATCH /api/profile`: Update user profile (requires auth)
  - Body: `{ "email": "new@example.com", "company": "New Company" }`

### API Keys

- `GET /api/api-keys`: List user's API keys (requires auth)
- `POST /api/api-keys`: Create a new API key (requires auth)
  - Body: `{ "name": "My API Key" }`
- `DELETE /api/api-keys/:id`: Deactivate an API key (requires auth)

### Credits & Transactions

- `GET /api/credit-bundles`: List available credit bundles
- `GET /api/transactions`: List user's transactions (requires auth)
- `POST /api/usage`: Record API usage (requires service key)
  - Body: `{ "apiKeyId": 1, "userId": 1, "queryComplexity": "high", "rowsProcessed": 1000, "computeTimeMs": 500, "dataTransferredBytes": 10240 }`

### System

- `GET /health`: Health check endpoint

## Connecting from Firebase

To connect your Firebase-hosted frontend to this API gateway:

1. Update your frontend API client to point to this gateway's URL
2. Include the JWT in the Authorization header for authenticated requests:

```javascript
// Example API request with authentication
const fetchUserData = async () => {
  const response = await fetch('https://your-api-gateway.com/api/user', {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('API request failed');
  }
  
  return await response.json();
};
```

## Security Considerations

- The API gateway only accepts connections from configured origins
- All sensitive endpoints require valid authentication
- Rate limiting prevents API abuse
- Database credentials are never exposed to the client

## Deployment Recommendations

### Using PM2 for Process Management

To keep your API gateway running and automatically restart on crashes:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start index.js --name "api-gateway"

# Configure PM2 to start on system boot
pm2 startup
pm2 save
```

### Using Nginx as a Reverse Proxy

Set up Nginx to forward requests to your API gateway and handle HTTPS:

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```