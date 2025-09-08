import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/shared/schema";
import { fetchAllUploadJobs } from "@/lib/admin-server-data";
import { JobListClient } from "@/components/admin/jobs/job-list-client";

// This is the new async Server Page for the job management list.
export default async function ManageJobsPage() {
  const session = await auth();
  
  // Server-side protection to ensure only admins can see this page
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    redirect("/login");
  }

  // 1. Fetch the initial list of all jobs from the server.
  const initialJobs = await fetchAllUploadJobs();

  // 2. Render the client component, passing the job data as props.
  return <JobListClient initialJobs={initialJobs} />;
}
