import AuthLayout from "@/app/login/layout"; // We can reuse the same AuthLayout from the login page

// This layout will wrap your app/register/page.tsx file, giving it the
// same two-column design as your login page for a consistent experience.
export default function RegisterPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayout>
      {children}
    </AuthLayout>
  );
}