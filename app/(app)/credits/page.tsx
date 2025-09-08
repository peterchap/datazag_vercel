import { CreditsClient } from "@/components/credits/credits-client";

// This is a simple Server Component.
// Its only job is to render the client-side component for this page.
export default function CreditsPage() {
  // The layout (sidebar, header, etc.) is automatically applied by
  // the app/(app)/layout.tsx file because this page is inside that folder.
  return <CreditsClient />;
}