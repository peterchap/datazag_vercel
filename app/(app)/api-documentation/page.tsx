import { DocsClient } from "@/components/api-documentation/api-documentation-client";

// This is a simple Server Component.
// Its only job is to render the client-side component for this page.
export default function DocsPage() {
  // The layout (header, footer, etc.) is automatically applied by
  // the app/documentation/layout.tsx file.
  return <DocsClient />;
}