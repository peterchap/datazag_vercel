# Customer Credit Portal

A comprehensive customer management platform built with **Next.js 14**, featuring multi-provider OAuth authentication, credit management, and API access control.

## ✨ Features

- **🔐 Multi-Provider Authentication**: Google, GitHub, Microsoft, LinkedIn OAuth + email/password
- **💳 Credit Management**: Stripe & PayPal integration with real-time balance tracking  
- **🔑 API Key Management**: Secure key generation with usage monitoring
- **📁 File Upload System**: Single and bulk file processing with progress tracking
- **📊 Usage Analytics**: Real-time API usage tracking and reporting
- **🎨 Modern UI**: Tailwind CSS with shadcn/ui components
- **🗄️ PostgreSQL Database**: Drizzle ORM with connection pooling
- **⚡ High Performance**: React Query for optimized data fetching

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Vercel account (for deployment)

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/customer-credit-portal.git
cd customer-credit-portal

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Configure your environment variables in .env.local
# (See DEPLOYMENT.md for detailed setup)

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation

### Backend  
- **Runtime**: Node.js with Next.js API Routes
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js v4
- **File Upload**: Built-in with progress tracking
- **Payments**: Stripe + PayPal integration

### Deployment
- **Platform**: Vercel (recommended)
- **Database**: Vercel Postgres, Supabase, or Neon
- **CI/CD**: GitHub Actions
- **Monitoring**: Vercel Analytics

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Session Security
JWT_SECRET=your-jwt-secret-key

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Email Service
SENDGRID_API_KEY=your-sendgrid-api-key

# Payment Processing
STRIPE_SECRET_KEY=your-stripe-secret-key
VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
```

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd customer-management-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.sample .env
# Edit .env with your actual values
```

4. Run database migrations:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

## OAuth Setup

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://yourdomain.com/auth/google/callback`
   - `http://localhost:5000/auth/google/callback` (for development)

### GitHub OAuth
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL:
   - `https://yourdomain.com/auth/github/callback`

### LinkedIn OAuth
1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Create a new app
3. Add redirect URLs in Auth settings

## Deployment

The application is configured for deployment on Replit with custom domain support.

### Custom Domain Setup
1. Configure DNS CNAME to point to your Replit deployment
2. Update OAuth callback URLs to use your custom domain
3. Ensure HTTPS is enabled for secure cookie transmission

## Project Structure

```
├── client/           # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Application pages
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utility functions
├── server/           # Backend Express application
│   ├── auth.ts          # Authentication setup
│   ├── oauth-strategies.ts  # OAuth configurations
│   ├── storage.ts       # Database operations
│   └── routes.ts        # API routes
├── shared/           # Shared types and schemas
└── api-gateway/      # External API integration
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open database studio

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details