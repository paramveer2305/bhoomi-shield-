import React, { useState } from 'react';
import { Card } from '../../components/ui';
import { Badge, getRiskBadgeVariant } from '../../components/ui';
import { Button } from '../../components/ui';
import { AlertTriangle, Bell, Shield, CheckCircle, XCircle, Eye, MapPin } from 'lucide-react';

const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState([
    { id: '1', title: 'Boundary Dispute Alert', description: 'Neighboring parcel MP-BPL-1025 has overlapping boundary claim', severity: 'HIGH', parcel: '124/2', date: '2024-03-15', read: false },
    { id: '2', title: 'Mutation Application Filed', description: 'Mutation application submitted for parcel 567/1A by adjacent owner', severity: 'MEDIUM', parcel: '567/1A', date: '2024-03-10', read: true },
    { id: '3', title: 'Risk Level Changed', description: 'Risk level for parcel 124/2 updated from LOW to MEDIUM', severity: 'MEDIUM', parcel: '124/2', date: '2024-03-08', read: false },
    { id: '4', title: 'Document Verification Complete', description: 'Sale deed for parcel 124/2 has been verified', severity: 'LOW', parcel: '124/2', date: '2024-03-05', read: true },
    { id: '5', title: 'Encroachment Detected', description: 'Satellite imagery shows potential encroachment on parcel 567/1A', severity: 'CRITICAL', parcel: '567/1A', date: '2024-03-01', read: false },
  ]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  const markAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    setSelectedAlert((prev: any) => prev?.id === id ? { ...prev, read: true } : prev);
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.read;
    if (filter === 'high') return ['HIGH', 'CRITICAL'].includes(alert.severity);
    return true;
  });

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alerts & Notifications</h1>
          <p className="text-secondary-600 mt-1">Monitor alerts for your land parcels</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={unreadCount > 0 ? 'warning' : 'success'} size="md" dot>
            {unreadCount} Unread
          </Badge>
        </div>
      </div>

      {/* Filter Tabs */}
      <Card variant="outlined" padding="sm">
        <div className="flex gap-2">
          {[
            { key: 'all' as const, label: 'All Alerts', count: alerts.length },
            { key: 'unread' as const, label: 'Unread', count: alerts.filter(a => !a.read).length },
            { key: 'high' as const, label: 'High Priority', count: alerts.filter(a => ['HIGH', 'CRITICAL'].includes(a.severity)).length },
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
        <div className="divide-y divide-border">
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No alerts</h3>
              <p className="text-secondary-500">You're all caught up!</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-6 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-start md:justify-between gap-4 ${!alert.read ? 'bg-primary-50/50' : ''}`}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                    alert.severity === 'CRITICAL' ? 'bg-destructive-100 text-destructive' :
                    alert.severity === 'HIGH' ? 'bg-warning-100 text-warning' :
                    alert.severity === 'MEDIUM' ? 'bg-info-100 text-info' :
                    'bg-success-100 text-success'
                  }`}>
                    {alert.severity === 'CRITICAL' && <AlertTriangle className="w-6 h-6" />}
                    {alert.severity === 'HIGH' && <AlertTriangle className="w-6 h-6" />}
                    {alert.severity === 'MEDIUM' && <Shield className="w-6 h-6" />}
                    {alert.severity === 'LOW' && <CheckCircle className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{alert.title}</h3>
                      <Badge variant={getRiskBadgeVariant(alert.severity)} size="sm">
                        {alert.severity}
                      </Badge>
                      {!alert.read && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
                    </div>
                    <p className="text-secondary-500 text-sm mt-1 truncate">{alert.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-secondary-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {alert.parcel}
                      </span>
                      <span>{new Date(alert.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedAlert(alert); }} aria-label="View alert">
                    <Eye className="w-4 h-4" />
                  </Button>
                  {!alert.read && (
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); markAsRead(alert.id); }} aria-label="Mark as read">
                      <CheckCircle className="w-4 h-4 text-success" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm animate-in">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden animate-in">
            <div className={`flex items-center justify-between p-6 border-b border-border ${
              selectedAlert.severity === 'CRITICAL' ? 'bg-destructive-50 border-destructive-100' :
              selectedAlert.severity === 'HIGH' ? 'bg-warning-50 border-warning-100' :
              'bg-secondary-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedAlert.severity === 'CRITICAL' ? 'bg-destructive-100 text-destructive' :
                  selectedAlert.severity === 'HIGH' ? 'bg-warning-100 text-warning' :
                  selectedAlert.severity === 'MEDIUM' ? 'bg-info-100 text-info' :
                  'bg-success-100 text-success'
                }`}>
                  {selectedAlert.severity === 'CRITICAL' && <AlertTriangle className="w-5 h-5" />}
                  {selectedAlert.severity === 'HIGH' && <AlertTriangle className="w-5 h-5" />}
                  {selectedAlert.severity === 'MEDIUM' && <Shield className="w-5 h-5" />}
                  {selectedAlert.severity === 'LOW' && <CheckCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{selectedAlert.title}</h2>
                  <p className="text-secondary-500 text-sm">{selectedAlert.parcel}</p>
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
                  <p className="text-secondary-500 text-sm font-medium">Description</p>
                  <p className="mt-1">{selectedAlert.description}</p>
                </div>
                <div>
                  <p className="text-secondary-500 text-sm font-medium">Parcel</p>
                  <p className="font-medium mt-1">{selectedAlert.parcel}</p>
                </div>
                <div>
                  <p className="text-secondary-500 text-sm font-medium">Date</p>
                  <p className="font-medium mt-1">{new Date(selectedAlert.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-secondary-500 text-sm font-medium">Status</p>
                  <Badge variant={selectedAlert.read ? 'success' : 'warning'} size="md" dot>
                    {selectedAlert.read ? 'Read' : 'Unread'}
                  </Badge>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedAlert(null)}>Close</Button>
                {!selectedAlert.read && (
                  <Button variant="primary" onClick={() => markAsRead(selectedAlert.id)} className="gap-2">
                    <CheckCircle className="w-4 h-4" />
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
}

export default AlertsPage;