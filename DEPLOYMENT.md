# Deployment Guide - Vercel + PostgreSQL + GitHub CI/CD

This guide will walk you through deploying your Customer Credit Portal to Vercel with a PostgreSQL database and GitHub Actions CI/CD pipeline.

## 🚀 **Quick Deployment Steps**

### 1. **Set up PostgreSQL Database**

Choose one of these PostgreSQL providers:

#### Option A: **Vercel Postgres** (Recommended - easiest integration)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project → Storage tab
3. Click "Create Database" → Select "Postgres"
4. Choose your plan and region
5. Copy the `DATABASE_URL` connection string

#### Option B: **Supabase** (Free tier available)
1. Go to [Supabase](https://supabase.com) and create a project
2. Go to Settings → Database
3. Copy the "Connection string" (URI format)
4. Replace `[YOUR-PASSWORD]` with your actual password

#### Option C: **Neon** (Serverless PostgreSQL)
1. Go to [Neon](https://neon.tech) and create a project
2. Copy the connection string from the dashboard

#### Option D: **Railway** (Simple deployment)
1. Go to [Railway](https://railway.app) and create a PostgreSQL service
2. Copy the `DATABASE_URL` from the service variables

### 2. **Deploy to Vercel**

#### Quick Deploy (Automatic):
1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Import Project" → Import from GitHub
4. Select your repository
5. Vercel will auto-detect Next.js and configure build settings

#### Manual Deploy:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from your project directory
cd CustomerCreditPortal
vercel

# Follow the prompts to link your project
```

### 3. **Configure Environment Variables**

In your Vercel project dashboard, go to Settings → Environment Variables and add:

#### **Required Variables:**
```bash
# Authentication
NEXTAUTH_SECRET=your-super-secret-key-32-chars-min
NEXTAUTH_URL=https://your-app.vercel.app

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# OAuth Providers (at least one required)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### **Optional Variables:**
```bash
# Additional OAuth providers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Email service
SENDGRID_API_KEY=your-sendgrid-api-key

# Payment processing
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret

# API Gateway
NEXT_PUBLIC_API_GATEWAY_URL=https://your-app.vercel.app
```

### 4. **Set up Database Schema**

After deployment, initialize your database:

```bash
# Install dependencies
npm install

# Push schema to database
npm run db:push
```

### 5. **Set up GitHub Actions CI/CD**

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```bash
# Vercel Integration
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id

# Environment variables for build
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-app.vercel.app
DATABASE_URL=your-database-url
```

#### To get Vercel credentials:
1. **VERCEL_TOKEN**: Go to Vercel → Settings → Tokens → Create Token
2. **VERCEL_ORG_ID**: Run `vercel whoami` in your terminal
3. **VERCEL_PROJECT_ID**: Found in your project settings on Vercel dashboard

## 🔧 **OAuth Provider Setup**

### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add `https://your-app.vercel.app/api/auth/callback/google` to authorized redirect URIs

### GitHub OAuth:
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth app
3. Set Authorization callback URL to `https://your-app.vercel.app/api/auth/callback/github`

### Microsoft OAuth:
1. Go to [Azure Portal](https://portal.azure.com)
2. Register an application in Azure AD
3. Add redirect URI: `https://your-app.vercel.app/api/auth/callback/azure-ad`

## 🔍 **Monitoring & Debugging**

### Check Deployment:
- **Vercel Dashboard**: View deployment logs and function logs
- **GitHub Actions**: Check workflow runs for CI/CD status
- **Database**: Monitor connections and query performance

### Common Issues:
1. **Build fails**: Check environment variables in Vercel settings
2. **Database connection**: Verify `DATABASE_URL` format and credentials
3. **OAuth errors**: Check redirect URIs in provider settings

## 🚀 **Production Checklist**

- [ ] Database set up and `DATABASE_URL` configured
- [ ] All required environment variables set in Vercel
- [ ] At least one OAuth provider configured
- [ ] Custom domain configured (optional)
- [ ] GitHub Actions secrets configured
- [ ] Database schema pushed (`npm run db:push`)
- [ ] Test authentication flows
- [ ] Test file uploads
- [ ] Test API key generation
- [ ] Monitor deployment logs

## 📞 **Support**

- **Vercel**: [Documentation](https://vercel.com/docs)
- **Next.js**: [Documentation](https://nextjs.org/docs)
- **NextAuth**: [Documentation](https://next-auth.js.org)
- **Drizzle ORM**: [Documentation](https://orm.drizzle.team)

Your app will be live at: `https://your-app.vercel.app` 🎉
