import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui';
import { Badge, getRiskBadgeVariant } from '../../components/ui';
import { Button } from '../../components/ui';
import { AlertTriangle, Bell, Shield, CheckCircle, XCircle, Eye, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { alerts } from '../../api/alerts';
import type { Alert } from '../../types';

const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [alertsData, setAlertsData] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await alerts.getAlerts({ limit: 100 });
      setAlertsData(data);
    } catch (err: any) {
      console.error('Failed to fetch citizen alerts:', err);
      setError(err?.message || 'Failed to load alerts. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const markAsRead = async (alertId: string) => {
    if (updatingIds.has(alertId)) return;
    setUpdatingIds((prev) => new Set(prev).add(alertId));
    try {
      await alerts.updateAlert(alertId, { status: 'ACKNOWLEDGED' });
      setAlertsData((prev) =>
        prev.map((a) =>
          a.alert_id === alertId
            ? { ...a, status: 'ACKNOWLEDGED', updated_at: new Date().toISOString() }
            : a
        )
      );
      setSelectedAlert((prev) =>
        prev?.alert_id === alertId ? { ...prev, status: 'ACKNOWLEDGED' } : prev
      );
      setActionSuccess('Alert marked as read');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to mark alert as read:', err);
      alert(err?.message || 'Failed to update alert. Please try again.');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  const isUnread = (alert: Alert) => alert.status === 'ACTIVE';

  const filteredAlerts = alertsData.filter((alert) => {
    if (filter === 'unread') return isUnread(alert);
    if (filter === 'high') return ['HIGH', 'CRITICAL'].includes(alert.severity);
    return true;
  });

  const unreadCount = alertsData.filter(isUnread).length;
  const highPriorityCount = alertsData.filter((a) => ['HIGH', 'CRITICAL'].includes(a.severity)).length;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alerts & Notifications</h1>
          <p className="text-secondary-600 mt-1">Monitor early warnings and risk alerts for your land parcels</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={unreadCount > 0 ? 'warning' : 'success'} size="md" dot>
            {unreadCount} Unread
          </Badge>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchAlerts} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-success-50 border border-success-200 text-success-800 rounded-xl text-sm flex items-center gap-2 animate-in">
          <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <Card variant="outlined" padding="sm">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all' as const, label: 'All Alerts', count: alertsData.length },
            { key: 'unread' as const, label: 'Unread', count: unreadCount },
            { key: 'high' as const, label: 'High Priority', count: highPriorityCount },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? 'primary' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              <span className="badge-primary text-xs">{tab.count}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Alerts List */}
      <Card variant="default" padding="none">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-secondary-600 font-medium">Loading alerts...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load Alerts</h3>
            <p className="text-secondary-500 text-sm max-w-md mx-auto mb-6">{error}</p>
            <Button variant="primary" onClick={fetchAlerts}>
              Retry
            </Button>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No alerts</h3>
            <p className="text-secondary-500">
              {filter !== 'all'
                ? 'No alerts match the selected filter.'
                : "You're all caught up! No active warnings found."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredAlerts.map((alert) => {
              const unread = isUnread(alert);
              const isUpdating = updatingIds.has(alert.alert_id);

              return (
                <div
                  key={alert.alert_id}
                  className={`p-6 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-start md:justify-between gap-4 cursor-pointer ${
                    unread ? 'bg-primary-50/50' : ''
                  }`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-destructive-100 text-destructive'
                          : alert.severity === 'HIGH'
                          ? 'bg-warning-100 text-warning'
                          : alert.severity === 'MEDIUM'
                          ? 'bg-info-100 text-info'
                          : 'bg-success-100 text-success'
                      }`}
                    >
                      {alert.severity === 'CRITICAL' && <AlertTriangle className="w-6 h-6" />}
                      {alert.severity === 'HIGH' && <AlertTriangle className="w-6 h-6" />}
                      {alert.severity === 'MEDIUM' && <Shield className="w-6 h-6" />}
                      {alert.severity === 'LOW' && <CheckCircle className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground">{alert.title}</h3>
                        <Badge variant={getRiskBadgeVariant(alert.severity)} size="sm">
                          {alert.severity}
                        </Badge>
                        <Badge
                          variant={
                            alert.status === 'RESOLVED'
                              ? 'success'
                              : alert.status === 'ACKNOWLEDGED'
                              ? 'info'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {alert.status.replace('_', ' ')}
                        </Badge>
                        {unread && <span className="w-2 h-2 bg-primary-500 rounded-full" title="Unread" />}
                      </div>
                      <p className="text-secondary-600 text-sm mt-1">{alert.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-secondary-500 flex-wrap">
                        <span
                          className="flex items-center gap-1 font-mono hover:text-primary-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/parcels/${alert.parcel_id}`);
                          }}
                          title="View Parcel"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          {alert.parcel_id}
                        </span>
                        <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAlert(alert);
                      }}
                      aria-label="View alert"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {unread && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isUpdating}
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(alert.alert_id);
                        }}
                        aria-label="Mark as read"
                      >
                        {isUpdating ? (
                          <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-success" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm animate-in">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden animate-in">
            <div
              className={`flex items-center justify-between p-6 border-b border-border ${
                selectedAlert.severity === 'CRITICAL'
                  ? 'bg-destructive-50 border-destructive-100'
                  : selectedAlert.severity === 'HIGH'
                  ? 'bg-warning-50 border-warning-100'
                  : 'bg-secondary-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedAlert.severity === 'CRITICAL'
                      ? 'bg-destructive-100 text-destructive'
                      : selectedAlert.severity === 'HIGH'
                      ? 'bg-warning-100 text-warning'
                      : selectedAlert.severity === 'MEDIUM'
                      ? 'bg-info-100 text-info'
                      : 'bg-success-100 text-success'
                  }`}
                >
                  {selectedAlert.severity === 'CRITICAL' && <AlertTriangle className="w-5 h-5" />}
                  {selectedAlert.severity === 'HIGH' && <AlertTriangle className="w-5 h-5" />}
                  {selectedAlert.severity === 'MEDIUM' && <Shield className="w-5 h-5" />}
                  {selectedAlert.severity === 'LOW' && <CheckCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{selectedAlert.title}</h2>
                  <p className="text-secondary-500 text-sm font-mono">{selectedAlert.parcel_id}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedAlert(null)}>
                <XCircle className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <p className="text-secondary-500 text-sm font-medium">Severity</p>
                  <Badge variant={getRiskBadgeVariant(selectedAlert.severity)} size="md" dot>
                    {selectedAlert.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-secondary-500 text-sm font-medium">Status</p>
                  <Badge
                    variant={
                      selectedAlert.status === 'RESOLVED'
                        ? 'success'
                        : selectedAlert.status === 'ACKNOWLEDGED'
                        ? 'info'
                        : 'warning'
                    }
                    size="md"
                    dot
                  >
                    {selectedAlert.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-secondary-500 text-sm font-medium">Message</p>
                  <p className="mt-1 text-foreground">{selectedAlert.message}</p>
                </div>
                <div>
                  <p className="text-secondary-500 text-sm font-medium">Parcel ID</p>
                  <p className="font-mono mt-1 text-sm">{selectedAlert.parcel_id}</p>
                </div>
                <div>
                  <p className="text-secondary-500 text-sm font-medium">Created On</p>
                  <p className="font-medium mt-1 text-sm">{new Date(selectedAlert.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border flex justify-end gap-3 flex-wrap">
                <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const pId = selectedAlert.parcel_id;
                    setSelectedAlert(null);
                    navigate(`/parcels/${pId}`);
                  }}
                >
                  View Parcel
                </Button>
                {isUnread(selectedAlert) && (
                  <Button
                    variant="primary"
                    disabled={updatingIds.has(selectedAlert.alert_id)}
                    onClick={() => markAsRead(selectedAlert.alert_id)}
                    className="gap-2"
                  >
                    {updatingIds.has(selectedAlert.alert_id) ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Mark as Read
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsPage;