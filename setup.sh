#!/bin/bash

echo ""
echo "========================================"
echo "  Customer Credit Portal - Quick Setup"
echo "========================================"
echo ""

echo "🚀 Setting up your Customer Credit Portal for deployment..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Check TypeScript
echo "🔍 Checking TypeScript..."
npm run check
if [ $? -ne 0 ]; then
    echo "❌ TypeScript check failed"
    exit 1
fi

echo "✅ TypeScript check passed"
echo ""

# Build the application
echo "🏗️ Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up your PostgreSQL database (see DEPLOYMENT.md)"
echo "2. Configure environment variables in Vercel"
echo "3. Deploy to Vercel: npm run deploy"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT.md"
echo ""
