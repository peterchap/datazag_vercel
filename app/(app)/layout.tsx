import { AppLayout } from "@/components/shared/AppLayout";
import { Sidebar } from "@/components/shared/sidebar"; // Assuming your unified sidebar is here

export default function ProtectedPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // This uses your reusable AppLayout component and passes in the
    // smart sidebar that adapts based on user role.
    <AppLayout sidebar={<Sidebar />}>
      {children}
    </AppLayout>
  );
}