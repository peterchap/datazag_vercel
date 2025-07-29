@echo off
echo.
echo ========================================
echo   Customer Credit Portal - Quick Setup
echo ========================================
echo.

echo 🚀 Setting up your Customer Credit Portal for deployment...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed
echo.

REM Check TypeScript
echo 🔍 Checking TypeScript...
call npm run check
if errorlevel 1 (
    echo ❌ TypeScript check failed
    pause
    exit /b 1
)

echo ✅ TypeScript check passed
echo.

REM Build the application
echo 🏗️ Building application...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo ✅ Build successful
echo.

echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Set up your PostgreSQL database (see DEPLOYMENT.md)
echo 2. Configure environment variables in Vercel
echo 3. Deploy to Vercel: npm run deploy
echo.
echo 📖 For detailed instructions, see DEPLOYMENT.md
echo.
pause
