import { db } from "@/lib/drizzle";
import { uploadJobs } from "@/shared/schema"; // Assuming you add an 'uploadJobs' table to your schema
import { eq, desc } from "drizzle-orm";
import type { UploadJob } from "@/shared/schema"; // You will need to export this type from your schema

/**
 * Fetches the upload history for a specific user.
 * @param userId The ID of the user whose job history to fetch.
 * @returns An array of upload job objects.
 */
export async function fetchUserUploadHistory(userId: string): Promise<UploadJob[]> {
  try {
    // Note: You will need to create an `upload_jobs` table in your database
    // with columns like id, userId, fileName, description, region, status, jobId, createdAt
    const jobHistory = await db.query.uploadJobs.findMany({
      where: eq(uploadJobs.userId, userId),
      orderBy: [desc(uploadJobs.createdAt)],
      limit: 50,
    });
    return jobHistory;
  } catch (error) {
    console.error("Error fetching user upload history:", error);
    return [];
  }
}