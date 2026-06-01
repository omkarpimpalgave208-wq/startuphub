import { useEffect, useState } from 'react';
import { X, Loader2, MessageSquare, Heart, User, AtSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Avatar } from './ui/Avatar';
import type { Notification } from '../types';
import { api } from '../lib/api';

interface NotificationsPanelProps {
  onClose: () => void;
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // REAL-TIME NOTIFICATIONS CHANNEL WITH MEMORY CLEANUP ON UNMOUNT
    const unsubscribe = api.subscribeToChanges(
      `realtime-notifications-${user.id}`,
      'notifications',
      'INSERT',
      (payload) => {
        if (payload.new && payload.new.user_id === user.id) {
          // Trigger reload to load foreign actor relationships correctly
          fetchNotifications();
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const data = await api.getNotifications(user.id);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await api.markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
      case 'reply':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'upvote':
        return <Heart className="w-4 h-4 text-orange-500" />;
      case 'follow':
        return <User className="w-4 h-4 text-green-500" />;
      default:
        return <AtSign className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.product_id) {
      return `/product/${notification.product_id}`;
    }
    if (notification.discussion_id) {
      return `/discussion/${notification.discussion_id}`;
    }
    if (notification.actor) {
      return `/profile/${notification.actor.username}`;
    }
    return '#';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Overlay for mobile viewports */}
      <div className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent sm:pointer-events-none" onClick={onClose} />
      
      <div className="fixed inset-x-0 bottom-0 sm:bottom-auto sm:inset-x-auto sm:right-4 sm:top-16 z-50 w-full sm:w-96 sm:max-w-[calc(100vw-2rem)] bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-xl shadow-2xl border-0 sm:border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[80vh] sm:max-h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-zinc-900 dark:text-white truncate">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full flex-shrink-0">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-orange-500 hover:text-orange-600 font-medium bg-transparent border-0 cursor-pointer"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 bg-transparent border-0 cursor-pointer"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Notifications list body */}
        <div className="overflow-y-auto max-h-[60vh] sm:max-h-[55vh] overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500">
              <p>No notifications yet</p>
              <p className="text-sm mt-1">When someone interacts with you, you&apos;ll see it here</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                to={getNotificationLink(notification)}
                onClick={() => {
                  if (!notification.read) markAsRead(notification.id);
                  onClose();
                }}
                className={`
                  flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors
                  ${!notification.read ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}
                `}
              >
                <div className="flex-shrink-0">
                  {notification.actor ? (
                    <Avatar
                      src={notification.actor.avatar_url}
                      alt={notification.actor.full_name || notification.actor.username}
                      size="sm"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-900 dark:text-white">
                    <span className="font-medium">
                      {notification.actor?.full_name || notification.actor?.username || 'Someone'}
                    </span>{' '}
                    <span className="text-zinc-600 dark:text-zinc-400">{notification.message}</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(notification.created_at).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-2" />
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}