import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  linkText?: string;
  linkHref?: string;
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  linkText,
  linkHref,
  onClick,
}: StatCardProps) {
  return (
    <Card className="overflow-hidden bg-webflow-card-light border-gray-200 shadow-sm">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-center">
            <div className={cn("flex-shrink-0 rounded-md p-3", iconBgColor || "bg-webflow-primary/20")}>
              <div className={cn("h-6 w-6", iconColor || "text-webflow-primary")}>{icon}</div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                <dd>
                  <div className="text-lg font-semibold text-gray-900">{value}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        {(linkText || onClick) && (
          <div className="bg-webflow-card-light-hover px-5 py-3 border-t border-gray-100">
            <div className="text-sm">
              {linkHref ? (
                <a
                  href={linkHref}
                  className="font-medium text-webflow-primary hover:text-webflow-heading"
                >
                  {linkText} <span className="ml-1">→</span>
                </a>
              ) : (
                <button
                  onClick={onClick}
                  className="font-medium text-webflow-primary hover:text-webflow-heading"
                >
                  {linkText} <span className="ml-1">→</span>
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
