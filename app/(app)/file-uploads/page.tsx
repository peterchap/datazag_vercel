import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchUserUploadHistory } from "@/lib/jobs-server-data";
import { FileUploadClient } from "@/components/uploads/uploads-client"

// This is the async Server Page for your file uploads.
export default async function FileUploadsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Fetch the user's past upload jobs for an instant page load.
  const initialUploadHistory = await fetchUserUploadHistory(session.user.id);

  // 2. Render your client component, passing the job history as a prop.
  return (
    <FileUploadClient initialUploadHistory={initialUploadHistory} />
  );
}