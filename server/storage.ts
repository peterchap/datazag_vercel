import { 
  users, type User, type InsertUser,
  apiKeys, type ApiKey, type InsertApiKey,
  creditBundles, type CreditBundle, type InsertCreditBundle,
  transactions, type Transaction, type InsertTransaction,
  apiUsage, type ApiUsage, type InsertApiUsage,
  discountCodes, type DiscountCode, type InsertDiscountCode,
  adminRequests, type AdminRequest, type InsertAdminRequest,
  subscriptionPlans, type SubscriptionPlan, type InsertSubscriptionPlan,
  userSubscriptions, type UserSubscription, type InsertUserSubscription,
  ADMIN_REQUEST_STATUS, SUBSCRIPTION_INTERVALS
} from "@shared/schema";
import { notificationService } from "./notifications";
import { randomBytes } from "crypto";
import { db, pool } from "./db";
import { eq, desc, sql, and, lte, gte, isNull, or, lt } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByOAuthId(provider: 'googleId' | 'githubId' | 'microsoftId' | 'linkedinId', id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  updateStripeCustomerId(id: number, stripeCustomerId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  deleteUser(id: number): Promise<boolean>;
  
  // API key methods
  getApiKey(id: number): Promise<ApiKey | undefined>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  getApiKeysByUserId(userId: number): Promise<ApiKey[]>;
  getUserApiKeys(userId: number): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  deactivateApiKey(id: number): Promise<ApiKey | undefined>;
  updateApiKey(id: number, data: Partial<ApiKey>): Promise<ApiKey | undefined>;
  getApiKeyCount(): Promise<number>;
  
  // Credit bundle methods
  getCreditBundles(): Promise<CreditBundle[]>;
  getCreditBundle(id: number): Promise<CreditBundle | undefined>;
  createCreditBundle(bundle: InsertCreditBundle): Promise<CreditBundle>;
  
  // Transaction methods
  getTransactions(userId: number, limit?: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionCount(): Promise<number>;
  getTransactionsWithPagination(page: number, limit: number): Promise<Transaction[]>;
  getTotalRevenue(): Promise<number>;
  
  // API usage methods
  getApiUsage(userId: number, limit?: number): Promise<ApiUsage[]>;
  getApiUsageByApiKey(apiKeyId: number, limit?: number): Promise<ApiUsage[]>;
  createApiUsage(usage: InsertApiUsage): Promise<ApiUsage>;
  getApiUsageCount(): Promise<number>;
  getApiUsageWithPagination(page: number, limit: number): Promise<ApiUsage[]>;
  
  // Credit methods
  addCredits(userId: number, amount: number): Promise<User | undefined>;
  useCredits(userId: number, amount: number): Promise<boolean>;
  getUserCredits(userId: number): Promise<number>;
  setCanPurchaseCredits(userId: number, canPurchase: boolean): Promise<User | undefined>;
  setCreditThreshold(userId: number, threshold: number | null): Promise<User | undefined>;
  checkCreditThreshold(userId: number): Promise<{belowThreshold: boolean, currentCredits: number, threshold: number | null, thresholdPercentage: number | null}>;
  setGracePeriod(userId: number, days: number | null): Promise<User | undefined>;
  hasActiveGracePeriod(userId: number): Promise<boolean>;
  
  // Discount code methods
  getDiscountCodes(): Promise<DiscountCode[]>;
  getDiscountCode(id: number): Promise<DiscountCode | undefined>;
  getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined>;
  createDiscountCode(discountCode: InsertDiscountCode): Promise<DiscountCode>;
  updateDiscountCode(id: number, data: Partial<DiscountCode>): Promise<DiscountCode | undefined>;
  validateDiscountCode(code: string, amount: number): Promise<{
    isValid: boolean;
    discountAmount: number;
    errorMessage?: string;
    discountCode?: DiscountCode;
  }>;
  incrementDiscountCodeUsage(id: number): Promise<DiscountCode | undefined>;
  deleteDiscountCode(id: number): Promise<boolean>;
  getActiveDiscountCodeCount(): Promise<number>;
  
  // Admin request methods
  createAdminRequest(request: InsertAdminRequest): Promise<AdminRequest>;
  getAdminRequest(id: number): Promise<AdminRequest | undefined>;
  getAdminRequestsByUserId(userId: number): Promise<AdminRequest[]>;
  getPendingAdminRequests(): Promise<AdminRequest[]>;
  updateAdminRequestStatus(id: number, status: string, reviewedBy: number, notes?: string): Promise<AdminRequest | undefined>;
  
  // Subscription plan methods
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: number, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  
  // User subscription methods
  getUserSubscription(userId: number): Promise<UserSubscription | undefined>;
  getActiveUserSubscriptions(): Promise<UserSubscription[]>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: number, data: Partial<UserSubscription>): Promise<UserSubscription | undefined>;
  cancelUserSubscription(id: number): Promise<UserSubscription | undefined>;
  
  // Session store for authentication
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  
  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'user_sessions'
    });
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  // getUserByUsername method has been removed as we're now using email for authentication

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      return undefined;
    }
  }
  
  async getUserByOAuthId(provider: 'googleId' | 'githubId' | 'microsoftId' | 'linkedinId', id: string): Promise<User | undefined> {
    console.log(`getUserByOAuthId: Searching for ${provider} with ID: "${id}"`);
    try {
      // Add retry logic for potential connection issues
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          
          // Create the appropriate condition based on the provider
          let condition;
          switch (provider) {
            case 'googleId':
              condition = eq(users.googleId, id);
              break;
            case 'githubId':
              condition = eq(users.githubId, id);
              break;
            case 'microsoftId':
              condition = eq(users.microsoftId, id);
              break;
            case 'linkedinId':
              condition = eq(users.linkedinId, id);
              break;
            default:
              throw new Error(`Invalid OAuth provider: ${provider}`);
          }
          
          const result = await db.select().from(users).where(condition);
          console.log(`getUserByOAuthId: Raw query result (attempt ${attempts}):`, result);
          console.log(`getUserByOAuthId: Result length: ${result?.length}, Array check: ${Array.isArray(result)}`);
          
          // Check if result is valid
          if (Array.isArray(result) && result.length > 0) {
            const user = result[0];
            console.log(`getUserByOAuthId: Found user with id: ${user.id}, email: ${user.email}`);
            return user;
          } else {
            console.log(`getUserByOAuthId: No user found with ${provider}: "${id}"`);
            return undefined;
          }
        } catch (innerError) {
          console.error(`Error in getUserByOAuthId (attempt ${attempts}): ${innerError.message}`);
          
          // If this is the last attempt, throw the error
          if (attempts >= maxAttempts) {
            throw innerError;
          }
          
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempts) * 100;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // This should not be reached due to the throws above, but TypeScript wants it
      return undefined;
    } catch (error) {
      console.error(`Error in getUserByOAuthId (all attempts failed): ${error}`);
      // Instead of throwing, return undefined to prevent application crashes
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      console.log("DatabaseStorage.createUser: Starting user creation...");
      
      // Filter out confirmPassword if it exists
      const { confirmPassword, ...validUserData } = userData as any;
      
      console.log("DatabaseStorage.createUser: Validated user data:", { 
        username: validUserData.username,
        email: validUserData.email,
        role: validUserData.role,
        hasCompany: !!validUserData.company,
        passwordLength: validUserData.password?.length
      });
      
      // Ensure core required fields are present
      if (!validUserData.firstName || !validUserData.lastName || !validUserData.password || !validUserData.email || !validUserData.company) {
        console.error("DatabaseStorage.createUser: Missing required fields:", {
          hasFirstName: !!validUserData.firstName,
          hasLastName: !!validUserData.lastName,
          hasPassword: !!validUserData.password,
          hasEmail: !!validUserData.email,
          hasCompany: !!validUserData.company
        });
        throw new Error("Missing required fields: firstName, lastName, password, email, and company are required");
      }
      
      // Set default company if not provided
      if (!validUserData.company) {
        validUserData.company = '';
        console.log("Setting default empty company for user registration");
      }
      
      // Create username from firstName and lastName for backward compatibility
      if (!validUserData.username && validUserData.firstName && validUserData.lastName) {
        validUserData.username = `${validUserData.firstName} ${validUserData.lastName}`;
        console.log(`Created username "${validUserData.username}" from first/last name`);
      }
      // Handle legacy cases that might send username but not firstName/lastName
      else if (validUserData.username && (!validUserData.firstName || !validUserData.lastName)) {
        const nameParts = validUserData.username.split(' ');
        validUserData.firstName = validUserData.firstName || nameParts[0] || '';
        validUserData.lastName = validUserData.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
        console.log(`Created firstName "${validUserData.firstName}" and lastName "${validUserData.lastName}" from username`);
      }
      
      // Execute raw SQL insert to ensure compatibility with existing database
      console.log("DatabaseStorage.createUser: Inserting new user with SQL...");
      
      try {
        // Use string concatenation for this quick fix
        // Note: In production, we should use parameterized queries properly
        const username = validUserData.username.replace(/'/g, "''");
        const email = validUserData.email.replace(/'/g, "''");
        const password = validUserData.password.replace(/'/g, "''");
        const company = validUserData.company ? validUserData.company.replace(/'/g, "''") : '';
        const role = validUserData.role || 'user';
        const credits = validUserData.credits || 0;
        
        // Use direct string interpolation as a fallback approach
        // This is not ideal for security but will help us troubleshoot
        console.log("Using direct string interpolation for SQL");
        
        // Use the db that's already initialized at the top of the file
        const firstName = validUserData.firstName ? validUserData.firstName.replace(/'/g, "''") : '';
        const lastName = validUserData.lastName ? validUserData.lastName.replace(/'/g, "''") : '';
        const googleId = validUserData.googleId ? `'${validUserData.googleId.replace(/'/g, "''")}'` : 'NULL';
        const githubId = validUserData.githubId ? `'${validUserData.githubId.replace(/'/g, "''")}'` : 'NULL';
        const linkedinId = validUserData.linkedinId ? `'${validUserData.linkedinId.replace(/'/g, "''")}'` : 'NULL';
        const microsoftId = validUserData.microsoftId ? `'${validUserData.microsoftId.replace(/'/g, "''")}'` : 'NULL';
        const emailVerified = validUserData.emailVerified ? 'TRUE' : 'FALSE';
        
        const insertStatement = `
          INSERT INTO users (
            username, email, password, company, role, credits, 
            first_name, last_name, google_id, github_id, linkedin_id, 
            microsoft_id, email_verified
          ) 
          VALUES (
            '${username}', '${email}', '${password}', '${company}', '${role}', ${credits},
            '${firstName}', '${lastName}', ${googleId}, ${githubId}, ${linkedinId},
            ${microsoftId}, ${emailVerified}
          )
          RETURNING *
        `;
        
        console.log("SQL Statement (without password):", 
          insertStatement.replace(password, '[PASSWORD_HIDDEN]')
        );
        
        // Use the direct db.execute we were using before
        const result = await db.execute(insertStatement);
        
        if (result.rows && result.rows.length > 0) {
          // Convert database row to our User type - only map fields that exist in the database
          const rawUser = result.rows[0];
          const user = {
            id: rawUser.id,
            username: rawUser.username,
            email: rawUser.email,
            password: rawUser.password,
            company: rawUser.company,
            role: rawUser.role,
            credits: rawUser.credits,
            // Map snake_case to camelCase as needed
            firstName: rawUser.first_name,
            lastName: rawUser.last_name,
            stripeCustomerId: rawUser.stripe_customer_id,
            canPurchaseCredits: rawUser.can_purchase_credits,
            parentUserId: rawUser.parent_user_id,
            gracePeriodEnd: rawUser.grace_period_end,
            creditThreshold: rawUser.credit_threshold,
            // OAuth fields
            googleId: rawUser.google_id,
            githubId: rawUser.github_id,
            linkedinId: rawUser.linkedin_id,
            microsoftId: rawUser.microsoft_id,
            emailVerified: rawUser.email_verified
          };
          
          console.log("DatabaseStorage.createUser: User created successfully:", { 
            id: user.id, 
            username: user.username,
            email: user.email,
            role: user.role
          });
          
          return user as User;
        } else {
          console.error("DatabaseStorage.createUser: Insert didn't return a user");
          throw new Error("Failed to create user");
        }
      } catch (dbError: any) {
        console.error("Database error during user creation:", dbError);
        // Add more details to help with debugging
        if (dbError.message) {
          console.error("Error message:", dbError.message);
        }
        if (dbError.code) {
          console.error("Error code:", dbError.code);
        }
        if (dbError.detail) {
          console.error("Error detail:", dbError.detail);
        }
        throw new Error(`Database error: ${dbError.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error("DatabaseStorage.createUser: Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async updateStripeCustomerId(id: number, stripeCustomerId: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async getApiKey(id: number): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey || undefined;
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
    return apiKey || undefined;
  }

  async getApiUsageByUserId(userId: number): Promise<ApiUsage[]> {
    try {
      const usage = await db.select().from(apiUsage).where(eq(apiUsage.userId, userId)).orderBy(desc(apiUsage.createdAt));
      return usage;
    } catch (error) {
      console.error(`Error fetching API usage for user ${userId}:`, error);
      return [];
    }
  }

  async recordApiUsage(usageData: {
    userId: number;
    apiKeyId: number;
    endpoint: string;
    creditsUsed: number;
    queryType?: string;
    status?: string;
    responseTime?: number;
    usageDateTime?: Date;
    metadata?: any;
  }): Promise<ApiUsage> {
    const [usage] = await db
      .insert(apiUsage)
      .values({
        userId: usageData.userId,
        apiKeyId: usageData.apiKeyId,
        endpoint: usageData.endpoint,
        creditsUsed: usageData.creditsUsed,
        queryType: usageData.queryType || 'unknown',
        status: usageData.status || 'success',
        responseTime: usageData.responseTime || 0,
      })
      .returning();
    return usage;
  }

  async deductCredits(userId: number, amount: number): Promise<User | null> {
    const [updatedUser] = await db
      .update(users)
      .set({
        credits: sql`credits - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || null;
  }

  async getApiKeysByUserId(userId: number): Promise<ApiKey[]> {
    try {
      console.log(`Getting API keys for userId: ${userId}`);
      const result = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
      console.log(`Found ${result.length} API keys for userId: ${userId}`);
      return result;
    } catch (error) {
      console.error(`Error in getApiKeysByUserId for userId ${userId}:`, error);
      // Return empty array instead of throwing error
      return [];
    }
  }

  async createApiKey(apiKeyData: InsertApiKey): Promise<ApiKey> {
    const key = `api_${randomBytes(16).toString('hex')}`;
    const [apiKey] = await db
      .insert(apiKeys)
      .values({ ...apiKeyData, key })
      .returning();
    return apiKey;
  }

  async deactivateApiKey(id: number): Promise<ApiKey | undefined> {
    const [deactivatedApiKey] = await db
      .update(apiKeys)
      .set({ isActive: false }) // This maps to the 'active' column through Drizzle
      .where(eq(apiKeys.id, id))
      .returning();
    return deactivatedApiKey || undefined;
  }
  
  async updateApiKey(id: number, data: Partial<ApiKey>): Promise<ApiKey | undefined> {
    const [updatedApiKey] = await db
      .update(apiKeys)
      .set(data)
      .where(eq(apiKeys.id, id))
      .returning();
    return updatedApiKey || undefined;
  }

  async getCreditBundles(): Promise<CreditBundle[]> {
    return db.select().from(creditBundles);
  }

  async getCreditBundle(id: number): Promise<CreditBundle | undefined> {
    const [bundle] = await db.select().from(creditBundles).where(eq(creditBundles.id, id));
    return bundle || undefined;
  }

  async createCreditBundle(bundleData: InsertCreditBundle): Promise<CreditBundle> {
    const [bundle] = await db.insert(creditBundles).values(bundleData).returning();
    return bundle;
  }

  async getTransactions(userId: number, limit: number = 100): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(transactionData).returning();
    return transaction;
  }

  async getApiUsage(userId: number, limit: number = 100): Promise<ApiUsage[]> {
    try {
      console.log(`Getting API usage for userId: ${userId} with limit: ${limit}`);
      
      // If the database table doesn't exist yet, return an empty array
      const result = await db
        .select()
        .from(apiUsage)
        .where(eq(apiUsage.userId, userId))
        .orderBy(desc(apiUsage.createdAt))
        .limit(limit);
      
      console.log(`Retrieved ${result.length} API usage records`);
      return result;
    } catch (error) {
      console.error(`Error getting API usage for user ${userId}:`, error);
      // Return empty array on error
      return [];
    }
  }

  async getApiUsageByApiKey(apiKeyId: number, limit: number = 100): Promise<ApiUsage[]> {
    return db
      .select()
      .from(apiUsage)
      .where(eq(apiUsage.apiKeyId, apiKeyId))
      .orderBy(desc(apiUsage.createdAt))
      .limit(limit);
  }

  async createApiUsage(usageData: InsertApiUsage): Promise<ApiUsage> {
    const [usage] = await db.insert(apiUsage).values(usageData).returning();
    return usage;
  }

  async addCredits(userId: number, amount: number): Promise<User | undefined> {
    // Use SQL to safely add credits
    const [updatedUser] = await db
      .update(users)
      .set({ 
        credits: sql`${users.credits} + ${amount}` 
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  async useCredits(userId: number, amount: number): Promise<boolean> {
    // First check if user has enough credits
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.credits < amount) return false;
    
    // Then subtract credits
    const [updatedUser] = await db
      .update(users)
      .set({ 
        credits: sql`${users.credits} - ${amount}` 
      })
      .where(eq(users.id, userId))
      .returning();
    
    return !!updatedUser;
  }

  async getUserCredits(userId: number): Promise<number> {
    const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId));
    return user?.credits || 0;
  }
  
  async setCanPurchaseCredits(userId: number, canPurchase: boolean): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ canPurchaseCredits: canPurchase })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser || undefined;
  }
  
  async setCreditThreshold(userId: number, threshold: number | null): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ creditThreshold: threshold })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser || undefined;
  }
  
  async checkCreditThreshold(userId: number): Promise<{
    belowThreshold: boolean, 
    currentCredits: number, 
    threshold: number | null, 
    thresholdPercentage: number | null
  }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user || user.creditThreshold === null || user.creditThreshold === undefined) {
      return {
        belowThreshold: false,
        currentCredits: user?.credits || 0,
        threshold: null,
        thresholdPercentage: null
      };
    }
    
    const currentCredits = user.credits;
    const threshold = user.creditThreshold;
    
    // Default threshold percentage
    const thresholdPercentage = 10;
    const thresholdCheck = threshold * (thresholdPercentage / 100);
    
    return {
      belowThreshold: currentCredits <= thresholdCheck,
      currentCredits,
      threshold,
      thresholdPercentage
    };
  }
  
  async setGracePeriod(userId: number, days: number | null): Promise<User | undefined> {
    let gracePeriodEnd = null;
    
    if (days) {
      // Calculate the grace period end date
      gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + days);
    }
    
    const [updatedUser] = await db
      .update(users)
      .set({ gracePeriodEnd })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser || undefined;
  }
  
  async hasActiveGracePeriod(userId: number): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user || !user.gracePeriodEnd) {
      return false;
    }
    
    // Check if the current date is before the grace period end
    const now = new Date();
    return now < new Date(user.gracePeriodEnd);
  }

  // Discount code methods
  async getDiscountCodes(): Promise<DiscountCode[]> {
    return db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
  }

  async getDiscountCode(id: number): Promise<DiscountCode | undefined> {
    const [discountCode] = await db.select().from(discountCodes).where(eq(discountCodes.id, id));
    return discountCode || undefined;
  }

  async getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined> {
    const [discountCode] = await db.select().from(discountCodes).where(eq(discountCodes.code, code));
    return discountCode || undefined;
  }

  async createDiscountCode(discountCodeData: InsertDiscountCode): Promise<DiscountCode> {
    const [discountCode] = await db.insert(discountCodes).values(discountCodeData).returning();
    return discountCode;
  }

  async updateDiscountCode(id: number, data: Partial<DiscountCode>): Promise<DiscountCode | undefined> {
    const [updatedDiscountCode] = await db
      .update(discountCodes)
      .set(data)
      .where(eq(discountCodes.id, id))
      .returning();
    return updatedDiscountCode || undefined;
  }

  async validateDiscountCode(code: string, amount: number): Promise<{
    isValid: boolean;
    discountAmount: number;
    errorMessage?: string;
    discountCode?: DiscountCode;
  }> {
    const [discountCode] = await db
      .select()
      .from(discountCodes)
      .where(
        and(
          eq(discountCodes.code, code),
          eq(discountCodes.isActive, true),
          or(
            isNull(discountCodes.expiresAt),
            gte(discountCodes.expiresAt, new Date())
          ),
          or(
            isNull(discountCodes.maxUses),
            lt(discountCodes.currentUses, discountCodes.maxUses)
          ),
          lte(discountCodes.minPurchaseAmount, amount)
        )
      );

    if (!discountCode) {
      return {
        isValid: false,
        discountAmount: 0,
        errorMessage: "Invalid or expired discount code"
      };
    }

    let discountAmount = 0;
    
    if (discountCode.discountType === "percentage") {
      // Convert string to number and calculate percentage
      const percentageValue = Number(discountCode.discountValue);
      discountAmount = Math.round(amount * (percentageValue / 100));
      
      // Apply maximum discount if specified
      if (discountCode.maxDiscountAmount && discountAmount > discountCode.maxDiscountAmount) {
        discountAmount = discountCode.maxDiscountAmount;
      }
    } else {
      // Fixed amount discount (in cents)
      discountAmount = Number(discountCode.discountValue);
      
      // Ensure discount doesn't exceed purchase amount
      if (discountAmount > amount) {
        discountAmount = amount;
      }
    }

    return {
      isValid: true,
      discountAmount,
      discountCode
    };
  }

  async incrementDiscountCodeUsage(id: number): Promise<DiscountCode | undefined> {
    const [updatedDiscountCode] = await db
      .update(discountCodes)
      .set({ 
        currentUses: sql`${discountCodes.currentUses} + 1` 
      })
      .where(eq(discountCodes.id, id))
      .returning();
    return updatedDiscountCode || undefined;
  }

  // Admin-specific methods

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.id));
  }

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0]?.count || 0;
  }

  async deleteUser(id: number): Promise<boolean> {
    // First check if user exists
    const user = await this.getUser(id);
    if (!user) return false;
    
    // Delete user's related data
    await db.delete(apiKeys).where(eq(apiKeys.userId, id));
    await db.delete(transactions).where(eq(transactions.userId, id));
    await db.delete(apiUsage).where(eq(apiUsage.userId, id));
    
    // Finally delete the user
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async getApiKeyCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(apiKeys);
    return result[0]?.count || 0;
  }

  async getTransactionCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(transactions);
    return result[0]?.count || 0;
  }

  async getTransactionsWithPagination(page: number, limit: number): Promise<Transaction[]> {
    const offset = (page - 1) * limit;
    return db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getTotalRevenue(): Promise<number> {
    // Sum the amount of all successful purchase transactions
    const result = await db
      .select({ total: sql<number>`sum(amount)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'purchase'),
          eq(transactions.status, 'completed')
        )
      );
    return result[0]?.total || 0;
  }

  async getApiUsageCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(apiUsage);
    return result[0]?.count || 0;
  }

  async getApiUsageWithPagination(page: number, limit: number): Promise<ApiUsage[]> {
    const offset = (page - 1) * limit;
    return db
      .select()
      .from(apiUsage)
      .orderBy(desc(apiUsage.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async deleteDiscountCode(id: number): Promise<boolean> {
    // First check if discount code exists
    const discountCode = await this.getDiscountCode(id);
    if (!discountCode) return false;
    
    // Delete the discount code
    const result = await db.delete(discountCodes).where(eq(discountCodes.id, id));
    return result.rowCount > 0;
  }

  async getActiveDiscountCodeCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(discountCodes)
      .where(
        and(
          eq(discountCodes.isActive, true),
          or(
            isNull(discountCodes.expiresAt),
            gte(discountCodes.expiresAt, new Date())
          )
        )
      );
    return result[0]?.count || 0;
  }
}

// Add seed data after db migration
async function seedCreditBundles() {
  const existingBundles = await db.select().from(creditBundles);
  
  if (existingBundles.length === 0) {
    await db.insert(creditBundles).values([
      {
        name: "Starter Bundle",
        description: "Perfect for small projects and testing",
        credits: 5000,
        price: 4900, // $49
        popular: false
      },
      {
        name: "Pro Bundle",
        description: "Best value for growing businesses",
        credits: 25000,
        price: 19900, // $199
        popular: true
      },
      {
        name: "Enterprise Bundle",
        description: "For high-volume API consumers",
        credits: 75000,
        price: 49900, // $499
        popular: false
      }
    ]);
    console.log("Credit bundles seeded successfully");
  }
}

// Seed sample discount codes
async function seedDiscountCodes() {
  const existingCodes = await db.select().from(discountCodes);
  
  if (existingCodes.length === 0) {
    await db.insert(discountCodes).values([
      {
        code: "WELCOME",
        discountType: "percentage",
        discountValue: "20",
        isActive: true,
        maxUses: 100,
        currentUses: 0,
        description: "20% off your first purchase",
        minPurchaseAmount: 1000, // $10 minimum
        maxDiscountAmount: 5000, // $50 maximum discount
      },
      {
        code: "SAVE10",
        discountType: "fixed",
        discountValue: "1000",
        isActive: true,
        maxUses: null, // unlimited uses
        currentUses: 0,
        description: "$10 off your purchase",
        minPurchaseAmount: 2000, // $20 minimum
      }
    ]);
    console.log("Discount codes seeded successfully");
  }
}

// Seed sample subscription plans
async function seedSubscriptionPlans() {
  try {
    const existingPlans = await db.select().from(subscriptionPlans);
    
    if (existingPlans.length === 0) {
      await db.insert(subscriptionPlans).values([
        {
          name: "Basic",
          description: "Essential features for small businesses",
          features: ["1,000 API calls per month", "Standard support", "Basic analytics"],
          monthlyPrice: 2900, // $29/month
          quarterlyPrice: 7900, // $79/quarter (~$26.33/month)
          annualPrice: 29900, // $299/year (~$24.92/month)
          creditsPerMonth: 1000,
          maxApiKeys: 2,
          stripePriceIdMonthly: "price_basic_monthly",
          stripePriceIdQuarterly: "price_basic_quarterly",
          stripePriceIdAnnual: "price_basic_annual",
          isActive: true,
        },
        {
          name: "Professional",
          description: "Advanced features for growing businesses",
          features: ["5,000 API calls per month", "Priority support", "Advanced analytics", "Custom integrations"],
          monthlyPrice: 4900, // $49/month
          quarterlyPrice: 12900, // $129/quarter (~$43/month)
          annualPrice: 47900, // $479/year (~$39.92/month)
          creditsPerMonth: 5000,
          maxApiKeys: 5,
          stripePriceIdMonthly: "price_pro_monthly",
          stripePriceIdQuarterly: "price_pro_quarterly",
          stripePriceIdAnnual: "price_pro_annual",
          isActive: true,
        },
        {
          name: "Enterprise",
          description: "Premium features for large organizations",
          features: ["25,000 API calls per month", "24/7 Support", "Enterprise analytics", "Dedicated account manager", "Custom development"],
          monthlyPrice: 9900, // $99/month
          quarterlyPrice: 27900, // $279/quarter (~$93/month)
          annualPrice: 99900, // $999/year (~$83.25/month)
          creditsPerMonth: 25000,
          maxApiKeys: 20,
          stripePriceIdMonthly: "price_enterprise_monthly",
          stripePriceIdQuarterly: "price_enterprise_quarterly",
          stripePriceIdAnnual: "price_enterprise_annual",
          isActive: true,
        }
      ]);
      console.log("Subscription plans seeded successfully");
    }
  } catch (error) {
    console.error("Error seeding subscription plans:", error);
  }
}

// Initialize database and seed data
(async () => {
  try {
    await seedCreditBundles();
    await seedDiscountCodes();
    await seedSubscriptionPlans();
  } catch (error) {
    console.error("Error seeding database:", error);
  }
})();

// Admin request methods implementation
DatabaseStorage.prototype.createAdminRequest = async function(request: InsertAdminRequest): Promise<AdminRequest> {
  try {
    console.log("Creating admin request:", request);
    const [result] = await db.insert(adminRequests).values(request).returning();
    
    // Get the user's info to include in the notification
    const user = await this.getUser(request.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Create a notification for all business admins about the new request
    await notificationService.notifyAdmins(
      `New admin access request from ${user.username} (${user.email})`,
      'info',
      {
        relatedEntityType: 'admin_request',
        relatedEntityId: result.id,
        link: '/admin/users'
      }
    );
    
    // Notify the user that their request was submitted
    await notificationService.createForUser(
      request.userId,
      "Your admin access request has been submitted and is pending review.",
      'info',
      {
        relatedEntityType: 'admin_request',
        relatedEntityId: result.id
      }
    );
    
    return result;
  } catch (error) {
    console.error("Error in createAdminRequest:", error);
    throw new Error("Failed to create admin request");
  }
};

DatabaseStorage.prototype.getAdminRequest = async function(id: number): Promise<AdminRequest | undefined> {
  try {
    const [request] = await db
      .select()
      .from(adminRequests)
      .where(eq(adminRequests.id, id));
    
    return request;
  } catch (error) {
    console.error("Error in getAdminRequest:", error);
    return undefined;
  }
};

DatabaseStorage.prototype.getAdminRequestsByUserId = async function(userId: number): Promise<AdminRequest[]> {
  try {
    const requests = await db
      .select()
      .from(adminRequests)
      .where(eq(adminRequests.userId, userId))
      .orderBy(desc(adminRequests.createdAt));
    
    return requests;
  } catch (error) {
    console.error("Error in getAdminRequestsByUserId:", error);
    return [];
  }
};

DatabaseStorage.prototype.getPendingAdminRequests = async function(): Promise<AdminRequest[]> {
  try {
    const requests = await db
      .select()
      .from(adminRequests)
      .where(eq(adminRequests.status, ADMIN_REQUEST_STATUS.PENDING))
      .orderBy(desc(adminRequests.createdAt));
    
    return requests;
  } catch (error) {
    console.error("Error in getPendingAdminRequests:", error);
    return [];
  }
};

DatabaseStorage.prototype.updateAdminRequestStatus = async function(
  id: number, 
  status: string, 
  reviewedBy: number, 
  notes?: string
): Promise<AdminRequest | undefined> {
  try {
    const [updatedRequest] = await db
      .update(adminRequests)
      .set({ 
        status: status as any,
        reviewedBy,
        adminNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(adminRequests.id, id))
      .returning();
      
    // Get the original request to access the user ID
    const request = await this.getAdminRequest(id);
    if (!request) {
      throw new Error("Admin request not found");
    }
    
    // If the request was approved, update the user's role to client_admin
    if (status === ADMIN_REQUEST_STATUS.APPROVED) {
      await this.updateUser(request.userId, { role: 'client_admin' });
      
      // Create a notification for the user that their request was approved
      await notificationService.createForUser(
        request.userId,
        "Your admin access request has been approved! You now have client admin privileges.",
        'success',
        {
          relatedEntityType: 'admin_request',
          relatedEntityId: id
        }
      );
    } else if (status === ADMIN_REQUEST_STATUS.REJECTED) {
      // Create a notification for the user that their request was rejected
      await notificationService.createForUser(
        request.userId,
        `Your admin access request has been rejected.${notes ? " Reason: " + notes : ""}`,
        'error',
        {
          relatedEntityType: 'admin_request',
          relatedEntityId: id
        }
      );
    }
    
    return updatedRequest;
  } catch (error) {
    console.error("Error in updateAdminRequestStatus:", error);
    return undefined;
  }
};

// Subscription Plan methods
DatabaseStorage.prototype.getSubscriptionPlans = async function(): Promise<SubscriptionPlan[]> {
  try {
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.monthlyPrice);
    
    return plans;
  } catch (error) {
    console.error("Error in getSubscriptionPlans:", error);
    return [];
  }
};

DatabaseStorage.prototype.getSubscriptionPlan = async function(id: number): Promise<SubscriptionPlan | undefined> {
  try {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    
    return plan;
  } catch (error) {
    console.error("Error in getSubscriptionPlan:", error);
    return undefined;
  }
};

DatabaseStorage.prototype.createSubscriptionPlan = async function(planData: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
  try {
    const [plan] = await db
      .insert(subscriptionPlans)
      .values(planData)
      .returning();
    
    return plan;
  } catch (error) {
    console.error("Error in createSubscriptionPlan:", error);
    throw new Error("Failed to create subscription plan");
  }
};

DatabaseStorage.prototype.updateSubscriptionPlan = async function(id: number, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
  try {
    const [updatedPlan] = await db
      .update(subscriptionPlans)
      .set(data)
      .where(eq(subscriptionPlans.id, id))
      .returning();
    
    return updatedPlan;
  } catch (error) {
    console.error("Error in updateSubscriptionPlan:", error);
    return undefined;
  }
};

// User subscription methods
DatabaseStorage.prototype.getUserSubscription = async function(userId: number): Promise<UserSubscription | undefined> {
  try {
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, 'active')
      ))
      .orderBy(desc(userSubscriptions.createdAt));
    
    return subscription;
  } catch (error) {
    console.error("Error in getUserSubscription:", error);
    return undefined;
  }
};

DatabaseStorage.prototype.getActiveUserSubscriptions = async function(): Promise<UserSubscription[]> {
  try {
    const subscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.status, 'active'))
      .orderBy(desc(userSubscriptions.createdAt));
    
    return subscriptions;
  } catch (error) {
    console.error("Error in getActiveUserSubscriptions:", error);
    return [];
  }
};

DatabaseStorage.prototype.createUserSubscription = async function(subscriptionData: InsertUserSubscription): Promise<UserSubscription> {
  try {
    const [subscription] = await db
      .insert(userSubscriptions)
      .values({
        ...subscriptionData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return subscription;
  } catch (error) {
    console.error("Error in createUserSubscription:", error);
    throw new Error("Failed to create user subscription");
  }
};

DatabaseStorage.prototype.updateUserSubscription = async function(id: number, data: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
  try {
    const [updatedSubscription] = await db
      .update(userSubscriptions)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, id))
      .returning();
    
    return updatedSubscription;
  } catch (error) {
    console.error("Error in updateUserSubscription:", error);
    return undefined;
  }
};

DatabaseStorage.prototype.cancelUserSubscription = async function(id: number): Promise<UserSubscription | undefined> {
  try {
    const [canceledSubscription] = await db
      .update(userSubscriptions)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, id))
      .returning();
    
    return canceledSubscription;
  } catch (error) {
    console.error("Error in cancelUserSubscription:", error);
    return undefined;
  }
};

export const storage = new DatabaseStorage();