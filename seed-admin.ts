// This is a one-time script to create your initial admin user.
// Run it with: npm run db:seed:admin

import * as dotenv from 'dotenv';
// --- THIS IS THE FIX ---
// This line must be at the very top. It finds and loads your .env.local
// file before any other code (like the database connection) runs.
dotenv.config({ path: '.env.local' });
// --- END OF FIX ---

import { db } from "./lib/drizzle";
import { users } from "./shared/schema";
import bcrypt from "bcryptjs";
const DATABASE_URL="postgresql://neondb_owner:npg_YvoBpI3PHL1u@ep-lively-math-adg9ggki-pooler.c-2.us-east-1.aws.neon.tech:5432/neondb?sslmode=require"
async function seedAdmin() {
  console.log("Starting admin user seeding process...");

  // --- DEFINE YOUR ADMIN USER DETAILS HERE ---
  const adminEmail = "admin@datazag.com"; // Replace with your admin email
  const adminPassword = "1Francis2!"; // Replace with a strong, temporary password
  const adminFirstName = "Admin";
  const adminLastName = "User";
  const adminCompany = "Datazag Internal";
  // --- END OF DETAILS ---

  
  try {
    // Check if the admin user already exists
    interface AdminUserSelect {
      email: string;
    }

    type EqString = (left: string, right: string) => unknown;

    const existingAdmin: AdminUserSelect | undefined = await db.query.users.findFirst({
      where: (users: AdminUserSelect, { eq }: { eq: EqString }) => eq(users.email, adminEmail),
    });

    if (existingAdmin) {
      console.log(`Admin user with email ${adminEmail} already exists. Aborting.`);
      return;
    }

    console.log("Hashing admin password...");
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    console.log("Inserting new admin user into the database...");
    await db.insert(users).values({
      firstName: adminFirstName,
      lastName: adminLastName,
      email: adminEmail,
      password: hashedPassword,
      company: adminCompany,
      role: 'business_admin',
      // emailVerified column expects a Date or null (not boolean)
      emailVerified: new Date(),
    });

    console.log("✅ Admin user created successfully!");
    console.log(`You can now log in with the email: ${adminEmail}`);

  } catch (error) {
    console.error("❌ Error during admin seeding:", error);
  } finally {
    console.log("Seeding process finished.");
  }
}

seedAdmin();