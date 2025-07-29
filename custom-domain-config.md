# Custom Domain Configuration for Customer Portal

## Current Configuration Status
Your Customer Portal is configured with:
- OAuth providers: Google, GitHub, LinkedIn
- Base URL configuration via environment variable
- External API integrations (PG_API, REDIS_API, BigQuery)

## Steps to Configure Your Custom Domain

### 1. Deploy Your Application First
Your application must be deployed before adding a custom domain:
```bash
# The lightweight deployment is ready in dist/ folder
# Click "Deploy" in Replit interface
```

### 2. Set Your Custom Domain
What domain would you like to use? Examples:
- `portal.yourcompany.com`
- `customer.yourcompany.com` 
- `app.yourcompany.com`

### 3. Environment Variable Update Required
Once you have your domain, set the BASE_URL environment variable:
```
BASE_URL=https://your-custom-domain.com
```

This ensures OAuth callbacks work correctly with your custom domain.

### 4. OAuth Provider Updates
You'll need to update OAuth app settings in:

**Google Console:**
- Add your custom domain to authorized origins
- Update callback URL to: `https://your-domain.com/auth/google/callback`

**GitHub Developer Settings:**
- Update homepage URL to your custom domain
- Update callback URL to: `https://your-domain.com/auth/github/callback`

**LinkedIn Developer Console:**
- Update redirect URLs to: `https://your-domain.com/auth/linkedin/callback`

### 5. External API Configuration
Your external APIs may need domain whitelist updates:
- PG_API: Add custom domain to CORS settings
- REDIS_API: Update allowed origins
- BigQuery API: Verify domain access permissions

## Ready to Proceed?
Please provide your desired custom domain, and I'll help you configure everything properly.