# 🚀 **DEPLOYMENT CHECKLIST - Customer Credit Portal**

## ✅ **Pre-Deployment Steps**

### 1. **Repository Setup**

- [ ] Code pushed to GitHub repository
- [ ] All sensitive files in `.gitignore`
- [ ] `.env.local` NOT committed (development only)
- [ ] README.md updated with project info

### 2. **Build Verification**

- [ ] Run `npm install` - no errors
- [ ] Run `npm run check` - TypeScript compiles
- [ ] Run `npm run lint` - no linting errors
- [ ] Run `npm run build` - builds successfully

## 🗄️ **Database Setup**

### **Neon PostgreSQL** (Recommended - Serverless)

- [ ] Go to [neon.tech](https://neon.tech) and create account
- [ ] Create new project (choose region closest to your users)
- [ ] Copy the **Connection String** from dashboard
- [ ] Add `DATABASE_URL` to Vercel environment variables
- [ ] Enable connection pooling for better performance

**Neon Benefits:**

- ✅ Serverless (scales to zero)
- ✅ Built-in connection pooling
- ✅ Generous free tier
- ✅ Automatic backups
- ✅ Perfect for Vercel deployments

### **Alternative Options:**

### Option B: **Supabase**

- [ ] Create project at [supabase.com](https://supabase.com)
- [ ] Go to Settings → Database
- [ ] Copy connection string
- [ ] Replace `[YOUR-PASSWORD]` with actual password

### Option C: **Railway**

- [ ] Create PostgreSQL service at [railway.app](https://railway.app)
- [ ] Copy `DATABASE_URL` from service variables

## 🔐 **Environment Variables Setup**

### **Required in Vercel Dashboard:**

```bash
# Authentication (REQUIRED)
NEXTAUTH_SECRET=your-32-character-secret-key
NEXTAUTH_URL=https://portal.datazag.com

# Database (REQUIRED)
DATABASE_URL=postgresql://user:pass@host:port/db

# OAuth - Need at least ONE provider
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### **Optional Variables:**

```bash
# Additional OAuth providers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Email service
SENDGRID_API_KEY=your-sendgrid-api-key

# Payment processing
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# API Gateway
NEXT_PUBLIC_API_GATEWAY_URL=https://portal.datazag.com
```

## 🚀 **Vercel Deployment**

### **Method 1: GitHub Integration (Recommended)**

- [ ] Go to [vercel.com/dashboard](https://vercel.com/dashboard)
- [ ] Click "Import Project"
- [ ] Select your GitHub repository
- [ ] Vercel auto-detects Next.js settings
- [ ] Add environment variables
- [ ] Deploy!

### **Method 2: CLI Deployment**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd CustomerCreditPortal
vercel

# Follow prompts to link project
```

## 🔄 **CI/CD Setup (Optional)**

### **GitHub Secrets** (Repository Settings → Secrets):

- [ ] `VERCEL_TOKEN` - Get from Vercel → Settings → Tokens
- [ ] `VERCEL_ORG_ID` - Run `vercel whoami`
- [ ] `VERCEL_PROJECT_ID` - Found in Vercel project settings
- [ ] `NEXTAUTH_SECRET` - Same as in Vercel
- [ ] `DATABASE_URL` - Same as in Vercel

## 🗄️ **Database Initialization**

After deployment:

```bash
# Push database schema
npm run db:push

# Initialize with default admin user (optional)
npm run db:init
```

**Default Admin Credentials:**

- Email: `admin@example.com`
- Password: `admin123`
- ⚠️ **CHANGE IMMEDIATELY AFTER FIRST LOGIN!**

## 🔐 **OAuth Provider Configuration**

### **Google OAuth:**

1. [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable Google+ API
3. OAuth 2.0 credentials
4. Authorized redirect: `https://portal.datazag.com/api/auth/callback/google`

### **GitHub OAuth:**

1. GitHub → Settings → Developer settings → OAuth Apps
2. New OAuth app
3. Callback URL: `https://portal.datazag.com/api/auth/callback/github`

## ✅ **Post-Deployment Testing**

- [ ] Site loads: `https://portal.datazag.com`
- [ ] Database connection working
- [ ] Authentication flows work
- [ ] API key generation works
- [ ] File upload functionality works
- [ ] All pages load without errors

## 🔍 **Troubleshooting**

### **Common Issues:**

- **Build fails**: Check environment variables in Vercel
- **Database errors**: Verify `DATABASE_URL` format
- **OAuth errors**: Check redirect URIs in provider settings
- **500 errors**: Check Vercel function logs

### **Debug Resources:**

- Vercel Dashboard → Functions → View Logs
- GitHub Actions → Workflow runs
- Database provider dashboard

## 🎉 **Success!**

Your Customer Credit Portal is now live at:
**https://portal.datazag.com**

## 📞 **Support Links**

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth Documentation](https://next-auth.js.org)
- [Drizzle ORM Documentation](https://orm.drizzle.team)

---

_Last updated: July 2025_
