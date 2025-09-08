// components/layout/DatazagHeader.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function DatazagHeader() {
  return (
    <header className="w-full border-b border-[#566073] bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="https://datazag.com" className="flex items-center space-x-3">
              {<img
                src="/dz-logo.png"
                alt="Datazag Logo"
                className="w-30 h-10"
              />}
             
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-4">
            <Button
              asChild
              className="text-[#566073] border-[#566073] hover:bg-[#566073] hover:text-white font-['Open_Sans']"
            >
              <Link href="https://datazag.com" target="_blank" rel="noopener noreferrer">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Website
              </Link>
            </Button>

            {/* Portal Navigation */}
            <div className="flex items-center space-x-2 text-sm">
              <Link
                href="/dashboard"
                className="px-3 py-2 text-[#566073] hover:text-[#127108] font-['Open_Sans'] transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/api-keys"
                className="px-3 py-2 text-[#566073] hover:text-[#127108] font-['Open_Sans'] transition-colors"
              >
                API Keys
              </Link>
              <Link
                href="/credits"
                className="px-3 py-2 text-[#566073] hover:text-[#127108] font-['Open_Sans'] transition-colors"
              >
                Credits
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}