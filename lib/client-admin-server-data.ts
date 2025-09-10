import { db } from "@/lib/drizzle";
import { users } from "@/shared/schema";
import { eq } from "drizzle-orm";
import type { User } from "@/shared/schema";

/**
 * Fetches the list of users belonging to the same company as the
 * currently authenticated client admin. This now connects directly to the database.
 * @param adminUserId The ID of the client admin making the request.
 * @returns An array of user objects.
 */
export async function fetchCompanyUsers(adminUserId: string): Promise<User[]> {
  try {
    // 1. First, get the client admin's own user record to find their company name.
    const adminUser = await db.query.users.findFirst({
        where: eq(users.id, parseInt(adminUserId, 10)),
        columns: { company: true }
    });

    if (!adminUser?.company) {
        console.warn(`Client admin with ID ${adminUserId} does not have a company associated.`);
        return [];
    }

    // 2. Then, fetch all users who belong to that same company.
    const companyUsers = await db.query.users.findMany({
        where: eq(users.company, adminUser.company),
        orderBy: (users, { asc }) => [asc(users.firstName)],
    });

    return companyUsers;

  } catch (error) {
    console.error("Error fetching company users directly from DB:", error);
    return []; // Return an empty array on error to prevent the page from crashing.
  }
}