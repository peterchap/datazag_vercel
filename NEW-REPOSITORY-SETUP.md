# 🚀 **New Repository Setup Guide**

## **Step 1: Create New GitHub Repository**

1. Go to [GitHub](https://github.com) → "New repository"
2. **Repository name**: `customer-credit-portal` or `customer-portal`
3. **Description**: "Customer Credit Portal - Next.js application with PostgreSQL, authentication, and API management"
4. **Public/Private**: Choose based on your needs
5. **Don't initialize** with README, .gitignore, or license (we have these already)

## **Step 2: Prepare Clean Project Structure**

### **Option A: Windows (PowerShell/CMD)**
```cmd
REM Create a new directory for the clean project
mkdir customer-credit-portal-clean
cd customer-credit-portal-clean

REM Copy ONLY the CustomerCreditPortal contents to root level
xcopy "c:\Code\CustomerCreditPortal\*" . /E /I /H /Y

REM Initialize new git repository
git init
git add .
git commit -m "Initial commit: Customer Credit Portal Next.js application"
```

### **Option B: Linux/Mac/WSL (Bash)**
```bash
# Create a new directory for the clean project
mkdir customer-credit-portal-clean
cd customer-credit-portal-clean

# Copy ONLY the CustomerCreditPortal contents to root level
cp -r /c/Code/CustomerCreditPortal/* .
cp -r /c/Code/CustomerCreditPortal/.* . 2>/dev/null || true

# Initialize new git repository
git init
git add .
git commit -m "Initial commit: Customer Credit Portal Next.js application"
```

### **Option C: Direct from CustomerCreditPortal directory (Recommended)**
```bash
# Navigate to your existing project
cd "c:\Code\CustomerCreditPortal"

# Clean up Vite files first (see VITE-CLEANUP-GUIDE.md)
# Then initialize git in current directory
git init
git add .
git commit -m "Initial commit: Customer Credit Portal Next.js application"
```

## **Step 3: Connect to New GitHub Repository**

```bash
# Add your new repository as origin
git remote add origin https://github.com/YOUR_USERNAME/customer-credit-portal.git

# Push to new repository
git branch -M main
git push -u origin main
```

## **Step 4: Update Documentation**

The new repository will have:
- Clean project structure at root level
- All deployment files properly positioned
- Professional README and documentation
- Focused git history

## **Benefits of New Repository:**

✅ **Vercel Integration**: Works seamlessly with root-level Next.js  
✅ **Clean History**: No unrelated commits  
✅ **Professional Setup**: Focused, single-purpose repository  
✅ **Easy Deployment**: Direct Vercel import from GitHub  
✅ **Better CI/CD**: GitHub Actions work optimally  
✅ **Team Collaboration**: Easier access management  

## **Your Current Repository:**

Keep `dagster_pipeline` for your other projects:
- Data processing pipelines
- DNS research tools
- Streamlit applications
- Other utilities

This maintains organization while giving your customer portal its own professional space.
