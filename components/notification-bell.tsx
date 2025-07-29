import { useState, useEffect } from 'react';
import { Bell } from '@/lib/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, getQueryFn, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: number;
  userId: number;
  message: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
  createdAt: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  link?: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  // Fetch notifications
  const { 
    data: notifications = [], 
    isLoading,
    refetch
  } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: getQueryFn({ defaultValue: [] }),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60, // Refetch every minute
  });
  
  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/notifications/${id}/read`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the notifications cache to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark notification as read",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/notifications/mark-all-read');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the notifications cache to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Notifications cleared",
        description: "All notifications have been marked as read",
      });
    }
  });
  
  // Count unread notifications
  const unreadCount = Array.isArray(notifications) ? notifications.filter((n: Notification) => !n.read).length : 0;
  
  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsReadMutation.mutate(notification.id);
    
    // Navigate to the link if provided
    if (notification.link) {
      window.location.href = notification.link;
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full text-gray-500 hover:text-gray-600 hover:bg-gray-100">
          <Bell className="h-5 w-5" />
          
          {/* Notification badge */}
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-xs text-primary-600 hover:text-primary-800"
                disabled={markAllAsReadMutation.isPending}
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin h-5 w-5 border-2 border-primary-500 rounded-full border-t-transparent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({ 
  notification, 
  onClick 
}: { 
  notification: Notification;
  onClick: () => void;
}) {
  // Get background color based on notification type
  const getBgColor = () => {
    if (notification.read) return 'bg-gray-50';
    
    switch (notification.type) {
      case 'info': return 'bg-blue-50';
      case 'success': return 'bg-green-50';
      case 'warning': return 'bg-yellow-50';
      case 'error': return 'bg-red-50';
      default: return 'bg-gray-50';
    }
  };
  
  // Get border color based on notification type
  const getBorderColor = () => {
    switch (notification.type) {
      case 'info': return 'border-blue-400';
      case 'success': return 'border-green-400';
      case 'warning': return 'border-yellow-400';
      case 'error': return 'border-red-400';
      default: return 'border-gray-300';
    }
  };
  
  // Format timestamp
  const timestamp = new Date(notification.createdAt);
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });
  
  return (
    <div 
      className={cn(
        'p-4 border-l-2 cursor-pointer hover:bg-gray-100', 
        getBgColor(),
        getBorderColor(),
        notification.read ? 'opacity-70' : ''
      )}
      onClick={onClick}
    >
      <p className="text-sm text-gray-800 mb-1">{notification.message}</p>
      <p className="text-xs text-gray-500">{timeAgo}</p>
    </div>
  );
}