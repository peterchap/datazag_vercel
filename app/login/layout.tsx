import Image from "next/image";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // This creates a full-screen layout with two columns on larger screens
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      
      

      {/* Right Column: Marketing Messages and Branding */}
      <div className="hidden bg-[#0088ed] lg:flex lg:flex-col lg:justify-between p-12 text-white">
         
        <div className="mb-12 flex flex-col justify-center flex-1">
            <h1
            className="text-4xl font-extrabold mb-4"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: "#21548a", // Royal blue
              letterSpacing: "-0.02em",
            }}
            >
            DATAZAG
            </h1>
            <h2 className="text-3xl font-bold leading-tight">
            Domain Intelligence with Answers
            </h2>
          <ul className="mt-6 space-y-4 text-lg text-white/90">
            <li className="flex items-start">
              <CheckCircle className="mr-3 mt-1 h-5 w-5 shrink-0" />
              <span>Sign up for a free API Key and <strong>1,000</strong> credits</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="mr-3 mt-1 h-5 w-5 shrink-0" />
              <span>Use cases: KYC, Email Verification, and Bulk Data Cleaning</span>
            </li>
             <li className="flex items-start">
              <CheckCircle className="mr-3 mt-1 h-5 w-5 shrink-0" />
              <span>Data shares available on all major cloud providers</span>
            </li>
             <li className="flex items-start">
              <CheckCircle className="mr-3 mt-1 h-5 w-5 shrink-0" />
              <span>Over 300M domains updated daily</span>
            </li>
          </ul>
        </div>
      </div>
      {/* Left Column: The Login Form */}
      <div className="flex items-center justify-center py-12">
        {/* The LoginClient component from your Canvas will be rendered here */}
        {children}
      </div>
    </div>
  );
}