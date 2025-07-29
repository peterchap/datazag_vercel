import { Loader2 } from "lucide-react";

interface LoadingProps {
  text?: string;
  className?: string;
}

export function Loading({ text = "Loading...", className = "" }: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="mt-2 text-sm text-gray-500">{text}</p>
    </div>
  );
}