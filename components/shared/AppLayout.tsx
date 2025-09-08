'use client'; // This component needs state for the mobile sidebar

import * as React from 'react';
import { useState } from 'react';
import { Menu, X } from 'lucide-react'; // Icons for the mobile menu button

// This component accepts a sidebar component as a prop
interface AppLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayout({ sidebar, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // This root div applies the cohesive background to all sections.
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      
      {/* --- Desktop Sidebar --- */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex w-64 flex-col">
          {/* Renders the specific sidebar that was passed in */}
          {sidebar}
        </div>
      </div>

      {/* --- Mobile Sidebar (Overlay) --- */}
      <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`} role="dialog" aria-modal="true">
        <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-background">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6 text-primary" aria-hidden="true" />
            </button>
          </div>
          {/* Renders the specific sidebar for mobile view */}
          {sidebar}
        </div>
        <div className="w-14 flex-shrink-0" onClick={() => setSidebarOpen(false)} aria-hidden="true"></div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {/* Mobile Header with Hamburger Menu Button */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-background shadow-sm md:hidden">
          <button
            type="button"
            className="border-r border-border px-4 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <main className="flex-1">
          <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

