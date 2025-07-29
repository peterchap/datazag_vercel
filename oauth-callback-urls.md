# OAuth Provider Configuration Update

## Current Status
✅ Server configured with BASE_URL: https://workspace.pchaplin1.replit.app
✅ OAuth providers enabled: Google, GitHub, LinkedIn

## Required Updates to Fix Authorization Errors

### Google OAuth Console
1. Visit: https://console.developers.google.com/
2. Select your project with Client ID: 705890714749-qb...
3. Go to: Credentials > OAuth 2.0 Client IDs
4. Edit your OAuth client
5. Add to "Authorized redirect URIs":
   ```
   https://workspace.pchaplin1.replit.app/auth/google/callback
   ```

### GitHub OAuth App
1. Visit: https://github.com/settings/developers
2. Select OAuth App with Client ID: Ov23lit4ZwjxUR1ghpE0
3. Update "Authorization callback URL" to:
   ```
   https://workspace.pchaplin1.replit.app/auth/github/callback
   ```

### LinkedIn OAuth App
1. Visit: https://www.linkedin.com/developers/apps
2. Select app with Client ID: 78zhqaf57uupzi
3. In "Auth" tab, add to "Redirect URLs":
   ```
   https://workspace.pchaplin1.replit.app/auth/linkedin/callback
   ```

## Test After Updates
Once you've updated all three providers, test OAuth login at:
- https://workspace.pchaplin1.replit.app/auth/google
- https://workspace.pchaplin1.replit.app/auth/github  
- https://workspace.pchaplin1.replit.app/auth/linkedin