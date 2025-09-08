import { ReactNode } from "react";
import { DatazagHeader } from "./DatazagHeader";

interface DatazagLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

export function DatazagLayout({ children, showHeader = true }: DatazagLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fbfdfb' }}>
      {showHeader && <DatazagHeader />}
      <main className={showHeader ? "min-h-[calc(100vh-80px)]" : "min-h-screen"}>
        {children}
      </main>
    </div>
  );
}