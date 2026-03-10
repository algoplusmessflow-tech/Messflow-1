import { Bell, Check, Trash2, AlertTriangle, CreditCard, Package, Users, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useBroadcasts } from '@/hooks/useBroadcasts';
import { useSubscription } from '@/hooks/useSubscription';
import { useState, useEffect } from 'react';
const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  salary_due: CreditCard,
  low_stock: Package,
  subscription: AlertTriangle,
  broadcast: Megaphone,
  member: Users,
};

const typeColors: Record<string, string> = {
  salary_due: 'text-amber-500',
  low_stock: 'text-destructive',
  subscription: 'text-destructive',
  broadcast: 'text-primary',
  member: 'text-green-500',
};

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { latestBroadcast } = useBroadcasts();
  const { daysUntilExpiry, subscriptionStatus } = useSubscription();

  const [dismissedBroadcastId, setDismissedBroadcastId] = useState<string | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('dismissedBroadcastId');
    if (savedId) {
      setDismissedBroadcastId(savedId);
    }
  }, []);

  const handleDismissBroadcast = () => {
    if (latestBroadcast) {
      localStorage.setItem('dismissedBroadcastId', latestBroadcast.id);
      setDismissedBroadcastId(latestBroadcast.id);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
    handleDismissBroadcast();
  };

  const isRenewalDue = daysUntilExpiry !== null && daysUntilExpiry <= 7;
  const showBroadcast = !!latestBroadcast && latestBroadcast.id !== dismissedBroadcastId;

  const totalAlerts = (isRenewalDue ? 1 : 0) + (showBroadcast ? 1 : 0);
  const totalUnread = unreadCount + totalAlerts;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          {totalUnread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleMarkAllRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          <div className="divide-y divide-border">
            {/* Critical Alerts Section */}
            {(isRenewalDue || showBroadcast) && (
              <div className="bg-muted/30">
                {isRenewalDue && (
                  <div className="p-3 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer border-l-4 border-amber-500">
                    <div className="flex gap-3">
                      <div className="mt-0.5 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-amber-900 dark:text-amber-100">Subscription Renewal Due</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Your subscription expires in {daysUntilExpiry} days. Renew now to avoid interruption.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {showBroadcast && latestBroadcast && (
                  <div
                    className="p-3 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer border-l-4 border-primary"
                    onClick={handleDismissBroadcast}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 text-primary">
                        <Megaphone className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-primary">Announcement</p>
                        <p className="font-medium text-xs mt-0.5 truncate">{latestBroadcast.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{latestBroadcast.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(new Date(latestBroadcast.created_at))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Regular Notifications */}
            {notifications.length === 0 && !isRenewalDue && !showBroadcast ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Bell;
                const iconColor = typeColors[notification.type] || 'text-muted-foreground';

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-3 hover:bg-accent/50 transition-colors cursor-pointer',
                      !notification.is_read && 'bg-accent/30'
                    )}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead.mutate(notification.id);
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={cn('mt-0.5', iconColor)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{notification.title}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification.mutate(notification.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(new Date(notification.created_at))}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
