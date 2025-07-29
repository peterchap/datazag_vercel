# OAuth Authorization Error Fix

## Problem Identified
Your OAuth providers are configured with incorrect callback URLs. They need to be updated to match your live deployment:

**Current Deployment URL:** `https://workspace.pchaplin1.replit.app`

## Required OAuth Provider Updates

### 1. Google OAuth Console
- Go to: https://console.developers.google.com/
- Select your project
- Navigate to: Credentials > OAuth 2.0 Client IDs
- Edit your OAuth client
- Update "Authorized redirect URIs" to include:
  ```
  https://workspace.pchaplin1.replit.app/auth/google/callback
  ```

### 2. GitHub OAuth App
- Go to: https://github.com/settings/developers
- Select your OAuth App
- Update "Authorization callback URL" to:
  ```
  https://workspace.pchaplin1.replit.app/auth/github/callback
  ```

### 3. LinkedIn OAuth App
- Go to: https://www.linkedin.com/developers/apps
- Select your app
- In "Auth" tab, update "Redirect URLs" to include:
  ```
  https://workspace.pchaplin1.replit.app/auth/linkedin/callback
  ```

## Environment Variable Update
Set this environment variable in your Replit project:
```
BASE_URL=https://workspace.pchaplin1.replit.app
```

This ensures all OAuth callbacks use the correct live URL instead of localhost.