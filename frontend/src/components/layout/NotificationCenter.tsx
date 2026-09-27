import React, { useState } from 'react';
import { Bell, X, AlertTriangle, Shield, FileText, CheckCircle } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { isConnected } = useWebSocket({
    onMessage: (message) => {
      // Add new notification when message received
      if (message.type === 'alert_created') {
        addNotification({
          type: 'alert',
          title: 'New Alert',
          message: message.alert?.title || 'A new alert has been created',
          severity: message.alert?.severity?.toLowerCase() || 'warning',
        });
      } else if (message.type === 'verification_status_changed') {
        addNotification({
          type: 'verification',
          title: 'Verification Status Updated',
          message: `Case ${message.case_id} status changed to ${message.new_status}`,
          severity: 'info',
        });
      }
    },
  });

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // Request browser notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const notification = notifications.find((n) => n.id === id);
    if (notification && !notification.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getIcon = (type: string, severity: string) => {
    if (type === 'alert') {
      return <AlertTriangle className={`w-5 h-5 ${severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />;
    } else if (type === 'verification') {
      return <Shield className="w-5 h-5 text-blue-500" />;
    } else if (type === 'document') {
      return <FileText className="w-5 h-5 text-purple-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Connection Status Indicator */}
        <span
          className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-gray-400'
          }`}
          title={isConnected ? 'Real-time notifications active' : 'Disconnected'}
        />
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-elevated border border-gray-200 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isConnected ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Real-time updates active
                    </span>
                  ) : (
                    'Connecting...'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    You'll be notified about alerts and updates
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getSeverityClass(notification.severity)}`}>
                          {getIcon(notification.type, notification.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotification(notification.id);
                              }}
                              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            >
                              <X className="w-3 h-3 text-gray-500" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={clearAll}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
