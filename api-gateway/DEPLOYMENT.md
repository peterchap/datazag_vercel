# API Gateway Deployment Guide

This document provides instructions for deploying and configuring your API Gateway server to work with your Firebase frontend.

## Prerequisites

- Node.js server (Ubuntu recommended)
- PostgreSQL database
- Domain name with SSL (optional but recommended)
- Firebase project

## Environment Configuration

1. Copy the sample environment file and customize it:

```bash
cp .env.sample .env
```

2. Edit the `.env` file with your specific configuration:
   - Set database connection string
   - Configure JWT secret
   - Set appropriate CORS settings 
   - Configure API service key

### CORS Configuration

The API Gateway implements CORS protection to secure your API from unauthorized domains. You need to configure this correctly to allow your Firebase app to communicate with the API.

Add your Firebase domains to the `ALLOWED_ORIGINS` environment variable:

```
ALLOWED_ORIGINS=http://localhost:5000,https://your-firebase-app.web.app,https://your-firebase-app.firebaseapp.com
```

For development, you can set `CORS_ALLOW_ALL=true` to temporarily allow all origins, but this should not be used in production.

## Setting up Firebase with API Gateway

### 1. Add Environment Variables to Firebase

In your GitHub Actions workflow file (`.github/workflows/deploy.yml`), add your API Gateway URL as a build environment variable:

```yaml
- name: Build with environment variables
  env:
    VITE_API_GATEWAY_URL: ${{ secrets.VITE_API_GATEWAY_URL }}
  run: npm ci && npm run build
```

### 2. Set Repository Secrets

In your GitHub repository settings, add the following secrets:
- `VITE_API_GATEWAY_URL`: The full URL to your API Gateway (e.g., https://api.yourdomain.com)

### 3. Test the Connection

After deployment, navigate to the API Connection Test page in your Firebase app to verify connectivity:
- https://your-firebase-app.web.app/api-connection-test

## Production Deployment

For production, we recommend:

1. Set up a reverse proxy with Nginx
2. Configure SSL with Let's Encrypt
3. Set NODE_ENV=production
4. Use a process manager like PM2

### Sample Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Starting with PM2

```bash
npm install -g pm2
pm2 start api-gateway/index.js --name "api-gateway"
pm2 startup
pm2 save
```

## Troubleshooting

### CORS Issues

If you see CORS errors in your browser console:

1. Verify your Firebase domain is correctly added to `ALLOWED_ORIGINS`
2. Check that the protocol (http/https) matches exactly
3. Confirm there are no trailing slashes in the origin URLs

### Database Connection Issues

If the API can't connect to your database:

1. Verify your DATABASE_URL format
2. Ensure your database server allows connections from your API server
3. Check DB_USE_SSL setting

### Server Not Starting

Common issues:

1. Port 3000 already in use (change the PORT environment variable)
2. Missing environment variables (check required variables in .env.sample)
3. Database connection failure

### Security Best Practices

1. Keep your JWT_SECRET and API_SERVICE_KEY secure
2. Rotate keys regularly
3. Use rate limiting to prevent abuse
4. Enable SSL for all production traffic
5. Implement proper logging and monitoring