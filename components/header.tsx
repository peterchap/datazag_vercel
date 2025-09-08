// components/header.tsx

"use client"; 

import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="mr-4 hidden md:flex">
          <a href="/dashboard" className="mr-6 flex items-center space-x-2">
            <img
              src="/attached_assets/dz-logo.png"
              alt="Datazag Logo"
              className="h-8 w-8 rounded-sm"
            />
            <span className="hidden font-bold sm:inline-block">
              Datazag Portal
            </span>
          </a>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
           {/* You can add other items like a user avatar menu here */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}