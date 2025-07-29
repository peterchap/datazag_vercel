import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import NotificationBell from "./notification-bell";

interface MobileNavProps {
  onMenuClick: () => void;
}

export default function MobileNav({ onMenuClick }: MobileNavProps) {
  const { user } = useAuth();
  const isAdmin = user && ['BUSINESS_ADMIN', 'CLIENT_ADMIN'].includes(user.role);

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-webflow-card-bg border-b border-webflow-border">
      <div className="flex items-center justify-between h-16 px-4">
        <h1 className="text-xl font-semibold">
          <span className="text-webflow-text-white">Data</span><span className="text-webflow-primary">zag</span>
        </h1>
        <div className="flex items-center">
          {isAdmin && <NotificationBell />}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-webflow-text-white hover:text-webflow-heading hover:bg-webflow-secondary"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
