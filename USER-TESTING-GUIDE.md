# 🔐 **USER ROLE TESTING GUIDE - Customer Credit Portal**

## 🏢 **3-Tier User System Overview**

### **1. BUSINESS_ADMIN (DataZag Level)**
**Role**: `business_admin`  
**Scope**: Platform-wide management
**Capabilities**:
- Manage all clients and their users
- View platform-wide analytics
- Configure system settings
- Handle billing and subscriptions
- Access to all data across all clients

### **2. CLIENT_ADMIN (Client Level)**
**Role**: `client_admin`  
**Scope**: Company/organization management  
**Capabilities**:
- Manage users within their company
- Purchase credits for their organization
- View company usage analytics
- Manage API keys for their company
- Control user permissions (canPurchaseCredits)

### **3. USER (API Consumer)**
**Role**: `user`  
**Scope**: Individual usage  
**Capabilities**:
- Use API services (consume credits)
- View their personal usage
- Generate personal API keys
- Update profile settings
- Limited to their own data

## 🧪 **Testing Plan by User Type**

### **Phase 1: Authentication Flow Testing**

#### **Test 1.1: Registration & Login**
```bash
# Test user registration for each role
1. Register as regular user
2. Register as client admin (should create company)
3. Business admin creates accounts (no self-registration)

# Test login flow
1. Email/password login
2. OAuth login (Google, GitHub)
3. Session persistence
4. Logout functionality
```

#### **Test 1.2: Password Management**
```bash
1. Password reset flow
2. Password change in profile
3. Account lockout after failed attempts
4. Two-factor authentication setup
```

### **Phase 2: User Role Functionality**

#### **Test 2.1: BUSINESS_ADMIN Features**
**Pages to Test**:
- `/admin` - Platform admin dashboard
- `/admin/clients` - Client management
- `/admin/users` - All users overview
- `/admin/analytics` - Platform analytics
- `/admin/billing` - Platform billing

**Key Functions**:
- [ ] View all clients and their data
- [ ] Create/edit/disable client accounts
- [ ] Access any user's information
- [ ] Platform-wide analytics and reporting
- [ ] System configuration settings

#### **Test 2.2: CLIENT_ADMIN Features**
**Pages to Test**:
- `/dashboard` - Company dashboard
- `/users` - Team user management
- `/credits` - Credit management and purchase
- `/api-keys` - Company API key management
- `/analytics` - Company usage analytics
- `/billing` - Company billing and invoices

**Key Functions**:
- [ ] Manage users in their company only
- [ ] Purchase credits for the company
- [ ] Set canPurchaseCredits permissions
- [ ] View company-wide usage
- [ ] Generate/revoke API keys
- [ ] Access billing and invoices

#### **Test 2.3: USER Features**
**Pages to Test**:
- `/dashboard` - Personal dashboard
- `/profile` - Profile management
- `/api-keys` - Personal API keys
- `/usage` - Personal usage tracking

**Key Functions**:
- [ ] View personal usage only
- [ ] Generate personal API keys
- [ ] Update profile information
- [ ] Cannot see other users' data
- [ ] Cannot purchase credits (unless canPurchaseCredits = true)

### **Phase 3: Permission Testing**

#### **Test 3.1: Access Control**
```bash
# Test unauthorized access attempts
1. USER trying to access /admin pages → Should redirect/403
2. CLIENT_ADMIN trying to access /admin → Should redirect/403
3. USER trying to see other users' data → Should be blocked
4. CLIENT_ADMIN trying to see other companies → Should be blocked
```

#### **Test 3.2: Credit Purchase Permissions**
```bash
# Test canPurchaseCredits functionality
1. USER with canPurchaseCredits = false → Purchase buttons disabled
2. USER with canPurchaseCredits = true → Can purchase
3. CLIENT_ADMIN → Always can purchase
4. BUSINESS_ADMIN → Always can purchase
```

#### **Test 3.3: API Key Scope**
```bash
# Test API key access levels
1. Personal API keys → Access only user's data
2. Company API keys → Access company-wide data
3. Admin API keys → Access platform-wide data
```

## 📋 **Testing Checklist**

### **Authentication Tests**
- [ ] User registration works
- [ ] Login/logout works
- [ ] Session persistence
- [ ] Password reset
- [ ] OAuth providers (Google/GitHub)
- [ ] Account lockout protection

### **BUSINESS_ADMIN Tests**
- [ ] Can access admin dashboard
- [ ] Can view all clients
- [ ] Can manage any user account
- [ ] Can see platform-wide analytics
- [ ] Can configure system settings

### **CLIENT_ADMIN Tests**
- [ ] Can access company dashboard
- [ ] Can manage team users only
- [ ] Can purchase credits
- [ ] Can set user permissions
- [ ] Cannot see other companies

### **USER Tests**
- [ ] Can access personal dashboard
- [ ] Can update profile
- [ ] Can generate API keys
- [ ] Cannot access admin functions
- [ ] Credit purchase based on permissions

### **Database Tests**
- [ ] User data saves correctly
- [ ] Role-based queries work
- [ ] Credit transactions tracked
- [ ] API usage logged
- [ ] Parent-child relationships (CLIENT_ADMIN → USER)

## 🎯 **Next Steps**

1. **Run database connectivity test**
2. **Create test users for each role**
3. **Test authentication flows**
4. **Verify page access permissions**
5. **Test credit and API functionality**
6. **Check data isolation between companies**

---

Would you like me to create specific test users or run the database connectivity test first?
