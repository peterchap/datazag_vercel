#!/bin/bash

echo ""
echo "🚀 Customer Credit Portal - New Repository Setup"
echo "================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the CustomerCreditPortal directory."
    exit 1
fi

echo "✅ Found package.json - we're in the right directory"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing new git repository..."
    git init
    echo "✅ Git repository initialized"
else
    echo "📁 Git repository already exists"
fi

echo ""
echo "📋 Repository Setup Checklist:"
echo ""
echo "1. 🌐 Create new GitHub repository:"
echo "   - Go to https://github.com/new"
echo "   - Name: customer-credit-portal"
echo "   - Description: Customer Credit Portal - Next.js application with PostgreSQL"
echo "   - Don't initialize with README (we have one)"
echo ""

echo "2. 🔗 Connect this directory to your new repository:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/customer-credit-portal.git"
echo ""

echo "3. 📤 Push to GitHub:"
echo "   git add ."
echo "   git commit -m \"Initial commit: Customer Credit Portal Next.js application\""
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""

echo "4. 🚀 Deploy to Vercel:"
echo "   - Go to https://vercel.com/dashboard"
echo "   - Import your new GitHub repository"
echo "   - Add environment variables (see DEPLOYMENT-CHECKLIST.md)"
echo ""

echo "📖 For detailed instructions, see:"
echo "   - NEW-REPOSITORY-SETUP.md"
echo "   - DEPLOYMENT.md"
echo "   - DEPLOYMENT-CHECKLIST.md"
echo ""

read -p "Press Enter to continue..."
