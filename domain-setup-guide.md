# Custom Domain Setup for Customer Portal

## Prerequisites
- Your application must be deployed on Replit
- You need to own the domain you want to use
- Access to your domain's DNS settings

## Steps to Add Custom Domain

### 1. Deploy Your Application
First, ensure your Customer Portal is deployed:
- Click the "Deploy" button in Replit
- Wait for deployment to complete
- Note your default `.replit.app` URL

### 2. Configure Custom Domain in Replit
1. Go to your Replit project
2. Click on the "Deployments" tab
3. Select your active deployment
4. Click "Settings" or "Configure"
5. Look for "Custom Domain" or "Domain" section
6. Enter your custom domain (e.g., `portal.yourdomain.com`)

### 3. DNS Configuration
Configure these DNS records with your domain provider:

#### For Subdomain (Recommended)
```
Type: CNAME
Name: portal (or your chosen subdomain)
Value: your-repl-name.username.replit.app
TTL: 300 (or default)
```

#### For Root Domain
```
Type: A
Name: @ (or leave blank)
Value: [Replit's IP - provided in deployment settings]
TTL: 300 (or default)
```

### 4. SSL Certificate
Replit automatically provisions SSL certificates for custom domains.
- This process can take 5-15 minutes
- Your site will be accessible via HTTPS once complete

## Common Domain Providers

### Cloudflare
1. Login to Cloudflare dashboard
2. Select your domain
3. Go to DNS > Records
4. Add the CNAME record as specified above
5. Ensure "Proxy status" is set to "DNS only" (grey cloud)

### GoDaddy
1. Login to GoDaddy account
2. Go to DNS Management
3. Add new CNAME record
4. Set TTL to 600 seconds or default

### Namecheap
1. Login to Namecheap account
2. Go to Domain List > Manage
3. Advanced DNS tab
4. Add new CNAME record

## Verification
After DNS configuration:
1. Wait 5-30 minutes for DNS propagation
2. Check domain status in Replit deployment settings
3. Visit your custom domain to verify it works
4. Ensure HTTPS is working

## Troubleshooting

### Domain Not Working
- Check DNS propagation: Use tools like `nslookup` or online DNS checkers
- Verify CNAME points to correct Replit URL
- Wait longer for DNS propagation (can take up to 48 hours)

### SSL Certificate Issues
- Ensure domain is pointing correctly to Replit
- Wait for automatic SSL provisioning
- Contact Replit support if SSL doesn't provision after 24 hours

## Example Configuration
If your domain is `example.com` and you want `portal.example.com`:

```
DNS Record:
Type: CNAME
Name: portal
Value: your-customer-portal.username.replit.app
```

Your portal will then be accessible at:
- `https://portal.example.com`
- Original URL will still work: `https://your-customer-portal.username.replit.app`