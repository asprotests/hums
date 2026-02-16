import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  BookOpen,
  GraduationCap,
  Wallet,
  Users,
  AlertCircle,
  Info,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { notificationsApi, type Notification, type NotificationType } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, isToday, isYesterday, startOfDay } from 'date-fns';

const NOTIFICATION_TYPES: { value: NotificationType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'INFO', label: 'Info' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'LIBRARY', label: 'Library' },
  { value: 'HR', label: 'HR' },
  { value: 'SYSTEM', label: 'System' },
];

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'ACADEMIC':
      return GraduationCap;
    case 'FINANCE':
      return Wallet;
    case 'LIBRARY':
      return BookOpen;
    case 'HR':
      return Users;
    case 'WARNING':
    case 'ERROR':
      return AlertCircle;
    case 'SUCCESS':
      return Check;
    default:
      return Info;
  }
};

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'SUCCESS':
      return 'text-green-500 bg-green-500/10';
    case 'WARNING':
      return 'text-amber-500 bg-amber-500/10';
    case 'ERROR':
      return 'text-red-500 bg-red-500/10';
    case 'ACADEMIC':
      return 'text-blue-500 bg-blue-500/10';
    case 'FINANCE':
      return 'text-emerald-500 bg-emerald-500/10';
    case 'LIBRARY':
      return 'text-purple-500 bg-purple-500/10';
    case 'HR':
      return 'text-orange-500 bg-orange-500/10';
    default:
      return 'text-gray-500 bg-gray-500/10';
  }
};

// Group notifications by date
function groupNotificationsByDate(notifications: Notification[]) {
  const groups: { date: Date; label: string; notifications: Notification[] }[] = [];

  notifications.forEach((notification) => {
    const date = startOfDay(new Date(notification.createdAt));
    const existingGroup = groups.find((g) => g.date.getTime() === date.getTime());

    if (existingGroup) {
      existingGroup.notifications.push(notification);
    } else {
      let label = format(date, 'MMMM d, yyyy');
      if (isToday(date)) {
        label = 'Today';
      } else if (isYesterday(date)) {
        label = 'Yesterday';
      }
      groups.push({ date, label, notifications: [notification] });
    }
  });

  return groups;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(searchParams.get('unreadOnly') === 'true');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [clearAllDialog, setClearAllDialog] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getNotifications({
        unreadOnly,
        type: typeFilter as NotificationType | undefined,
        page,
        limit: 20,
      });
      if (res.success && res.data) {
        setNotifications(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setTotal(res.data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, typeFilter, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (unreadOnly) params.set('unreadOnly', 'true');
    if (typeFilter) params.set('type', typeFilter);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [unreadOnly, typeFilter, page, setSearchParams]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setTotal((prev) => prev - 1);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationsApi.clearAll();
      setNotifications([]);
      setTotal(0);
      setClearAllDialog(false);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const groupedNotifications = groupNotificationsByDate(notifications);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {total} notification{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" onClick={() => setClearAllDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Checkbox
                id="unread"
                checked={unreadOnly}
                onCheckedChange={(checked) => {
                  setUnreadOnly(checked as boolean);
                  setPage(1);
                }}
              />
              <Label htmlFor="unread" className="cursor-pointer">
                Unread only
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Label>Type:</Label>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map((type) => (
                    <SelectItem key={type.value || 'all'} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mb-4" />
            <p className="text-lg">No notifications</p>
            <p className="text-sm">You're all caught up!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map((group) => (
            <div key={group.label}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {group.label}
              </h3>
              <Card>
                <CardContent className="p-0">
                  {group.notifications.map((notification, index) => {
                    const Icon = getNotificationIcon(notification.type);
                    const colorClass = getNotificationColor(notification.type);
                    const isLast = index === group.notifications.length - 1;

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'flex gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                          !notification.isRead && 'bg-muted/30',
                          !isLast && 'border-b'
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={cn('p-2 rounded-lg', colorClass)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p
                                  className={cn(
                                    'font-medium',
                                    !notification.isRead && 'font-semibold'
                                  )}
                                >
                                  {notification.title}
                                </p>
                                {!notification.isRead && (
                                  <Badge variant="secondary" className="text-xs">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                  title="Mark as read"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification.id);
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {notification.link && (
                            <Button
                              variant="link"
                              className="p-0 h-auto text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={clearAllDialog} onOpenChange={setClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your notifications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default NotificationsPage;
