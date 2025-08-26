// app/docs/layout.tsx
"use client";
import Sidebar from "@/components/sidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8">
      <aside className="hidden lg:block sticky top-20 h-[calc(100vh-6rem)]">
        <Sidebar />
      </aside>
      <main>{children}</main>
    </div>
  );
}