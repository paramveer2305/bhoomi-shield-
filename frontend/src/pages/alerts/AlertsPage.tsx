import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { alerts } from '../../api/alerts';
import type { Alert } from '../../types';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  ShieldAlert,
  X,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export interface AlertsPageProps {
  title?: string;
  subtitle?: string;
  role?: 'citizen' | 'officer' | string;
}

const severityOptions = [
  { value: '', label: 'All Severities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const getSeverityClass = (severity: string): string => {
  switch (severity) {
    case 'LOW':
      return 'border-l-green-500 bg-green-50';
    case 'MEDIUM':
      return 'border-l-yellow-500 bg-yellow-50';
    case 'HIGH':
      return 'border-l-orange-500 bg-orange-50';
    case 'CRITICAL':
      return 'border-l-red-500 bg-red-50';
    default:
      return 'border-l-gray-500 bg-gray-50';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'LOW':
      return <ShieldAlert className="w-5 h-5 text-green-500" />;
    case 'MEDIUM':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'HIGH':
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    case 'CRITICAL':
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    default:
      return <AlertTriangle className="w-5 h-5 text-gray-500" />;
  }
};

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-red-100 text-red-800';
    case 'ACKNOWLEDGED':
      return 'bg-blue-100 text-blue-800';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AlertCard: React.FC<{
  alert: Alert;
  onStatusChange: (alertId: string, status: Alert['status']) => void;
  isUpdating: boolean;
}> = ({ alert, onStatusChange, isUpdating }) => {
  const navigate = useNavigate();

  return (
    <div
      className={`rounded-xl border-2 p-6 transition-all hover:shadow-lg ${getSeverityClass(alert.severity)}`}
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            {getSeverityIcon(alert.severity)}
            <div>
              <h3 className="font-semibold text-gray-900">{alert.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityClass(
                    alert.severity
                  ).replace('bg-', 'bg-').replace('border-l-', '')}`}
                >
                  {alert.severity}
                </span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                    alert.status
                  )}`}
                >
                  {alert.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <p className="text-gray-700 mb-3">{alert.message}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(alert.created_at)}
            </span>
            <button
              type="button"
              onClick={() => navigate(`/parcels/${alert.parcel_id}`)}
              className="flex items-center gap-1 font-mono bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 px-2 py-0.5 rounded text-xs transition-colors cursor-pointer"
              title="View Parcel Details"
            >
              <span>{alert.parcel_id}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        {alert.status !== 'RESOLVED' && (
          <div className="flex flex-wrap sm:flex-col gap-2 flex-shrink-0 self-end sm:self-start">
            {alert.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => onStatusChange(alert.alert_id, 'ACKNOWLEDGED')}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                {isUpdating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                Acknowledge
              </button>
            )}
            {alert.status === 'ACKNOWLEDGED' && (
              <button
                type="button"
                onClick={() => onStatusChange(alert.alert_id, 'RESOLVED')}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                {isUpdating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                Mark Resolved
              </button>
            )}
            {alert.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => onStatusChange(alert.alert_id, 'RESOLVED')}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                {isUpdating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AlertsPage: React.FC<AlertsPageProps> = ({ title, subtitle }) => {
  const [alertsData, setAlertsData] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    severity: '',
    status: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { limit: '100' };
      if (filters.severity) params.severity = filters.severity;
      if (filters.status) params.status = filters.status;

      const data = await alerts.getAlerts(params);
      setAlertsData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load alerts. Please try again.');
      console.error('Error fetching alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const handleStatusChange = async (alertId: string, status: Alert['status']) => {
    if (updatingIds.has(alertId)) return;
    setUpdatingIds((prev) => new Set(prev).add(alertId));
    try {
      await alerts.updateAlert(alertId, { status });
      setAlertsData((prev) =>
        prev.map((alert) =>
          alert.alert_id === alertId ? { ...alert, status, updated_at: new Date().toISOString() } : alert
        )
      );
      setSuccessFeedback(`Alert ${alertId} status updated to ${status.replace('_', ' ')}.`);
      setTimeout(() => setSuccessFeedback(null), 3000);
    } catch (err: any) {
      console.error('Error updating alert:', err);
      setError(err?.message || 'Failed to update alert status. Please try again.');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Client-side search filtering by parcel_id, title, or message
  const filteredAlerts = alertsData.filter((alert) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      alert.parcel_id?.toLowerCase().includes(q) ||
      alert.title?.toLowerCase().includes(q) ||
      alert.message?.toLowerCase().includes(q) ||
      alert.alert_id?.toLowerCase().includes(q)
    );
  });

  // Summary counts from loaded dataset
  const activeCount = alertsData.filter((a) => a.status === 'ACTIVE').length;
  const acknowledgedCount = alertsData.filter((a) => a.status === 'ACKNOWLEDGED').length;
  const resolvedCount = alertsData.filter((a) => a.status === 'RESOLVED').length;
  const criticalCount = alertsData.filter((a) => a.severity === 'CRITICAL').length;

  const pageTitle = title || 'Alerts Dashboard';
  const pageSubtitle = subtitle || 'Monitor system-wide risk signals and early warnings';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-gray-600 mt-1">{pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAlerts}
            disabled={isLoading}
            className="px-3.5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Critical Alerts</p>
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-red-600">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Acknowledged</p>
              <p className="text-2xl font-bold text-blue-600">{acknowledgedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action / Success Feedback */}
      {successFeedback && (
        <div className="p-3.5 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center gap-2 animate-in">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span>{successFeedback}</span>
        </div>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchAlerts}
            className="text-xs font-semibold underline hover:no-underline ml-4 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by parcel ID, title, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            <select
              value={filters.severity}
              onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              {severityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {(filters.severity || filters.status || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setFilters({ severity: '', status: '' });
                  setSearchQuery('');
                }}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
            <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No alerts found</h2>
            <p className="text-gray-600">
              {searchQuery || filters.severity || filters.status
                ? 'No risk signals match your current search/filter criteria.'
                : 'No alerts are currently active in the system.'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.alert_id}
              alert={alert}
              onStatusChange={handleStatusChange}
              isUpdating={updatingIds.has(alert.alert_id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsPage;