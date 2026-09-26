import React, { useState, useEffect, useCallback } from 'react';
import { alerts } from '../../api/alerts';
import type { Alert } from '../../types';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  ShieldAlert,
  X,
} from 'lucide-react';

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
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`rounded-xl border-2 p-6 transition-all hover:shadow-lg ${getSeverityClass(alert.severity)}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between gap-4">
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
            <span className="flex items-center gap-1 font-mono bg-gray-100 px-2 py-0.5 rounded">
              {alert.parcel_id}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && alert.status !== 'RESOLVED' && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            {alert.status === 'ACTIVE' && (
              <button
                onClick={() => onStatusChange(alert.alert_id, 'ACKNOWLEDGED')}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Acknowledge
              </button>
            )}
            {alert.status === 'ACKNOWLEDGED' && (
              <button
                onClick={() => onStatusChange(alert.alert_id, 'RESOLVED')}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Resolved
              </button>
            )}
            {alert.status === 'ACTIVE' && (
              <button
                onClick={() => onStatusChange(alert.alert_id, 'RESOLVED')}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AlertsPage: React.FC = () => {
  const [alertsData, setAlertsData] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    severity: '',
    status: '',
  });
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (filters.severity) params.severity = filters.severity;
      if (filters.status) params.status = filters.status;

      const data = await alerts.getAlerts(params);
      setAlertsData(data);
    } catch (err) {
      setError('Failed to load alerts. Please try again.');
      console.error('Error fetching alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const handleStatusChange = async (alertId: string, status: Alert['status']) => {
    setUpdatingIds((prev) => new Set(prev).add(alertId));
    try {
      await alerts.updateAlert(alertId, { status });
      setAlertsData((prev) =>
        prev.map((alert) =>
          alert.alert_id === alertId ? { ...alert, status } : alert
        )
      );
    } catch (err) {
      console.error('Error updating alert:', err);
      setError('Failed to update alert status. Please try again.');
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Alerts Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor system-wide risk signals and early warnings</p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Alerts Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor system-wide risk signals and early warnings</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAlerts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Summary counts
  const activeCount = alertsData.filter((a) => a.status === 'ACTIVE').length;
  const acknowledgedCount = alertsData.filter((a) => a.status === 'ACKNOWLEDGED').length;
  const resolvedCount = alertsData.filter((a) => a.status === 'RESOLVED').length;
  const criticalCount = alertsData.filter((a) => a.severity === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alerts Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor system-wide risk signals and early warnings</p>
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

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">Filters:</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.severity}
              onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setFilters({ severity: '', status: '' })}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alertsData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
            <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No alerts found</h2>
            <p className="text-gray-600">No risk signals match your current filters.</p>
          </div>
        ) : (
          alertsData.map((alert) => (
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