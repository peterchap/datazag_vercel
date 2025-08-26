// components/site-header.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const base = "px-3 py-2 rounded-md text-sm font-medium";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold">Datazag</Link>
        <nav className="flex items-center gap-1">
          <Link href="/docs" className={`${base} ${isActive("/docs") ? "bg-slate-200 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
            Docs
          </Link>
          <Link href="/portal" className={`${base} ${isActive("/portal") ? "bg-slate-200 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
            Portal
          </Link>
          <Link href="/pricing" className={`${base} ${isActive("/pricing") ? "bg-slate-200 text-slate-900" : "text-slate-700 hover:bg-slate-100"}`}>
            Pricing
          </Link>
        </nav>
      </div>
    </header>
  );
}