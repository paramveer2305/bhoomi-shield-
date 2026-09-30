import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cases } from '../../api/cases';
import type { Case } from '../../types';
import {
  Briefcase,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  ExternalLink,
  Scale,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';

export interface CasesPageProps {
  title?: string;
  subtitle?: string;
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'OPEN':
      return 'bg-red-100 text-red-800';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800';
    case 'RESOLVED':
      return 'bg-emerald-100 text-emerald-800';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityBadgeClass = (priority: string): string => {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-800';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800';
    case 'LOW':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getRiskBadgeClass = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'CRITICAL':
    case 'HIGH':
      return 'bg-red-100 text-red-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800';
    case 'LOW':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const CasesPage: React.FC<CasesPageProps> = ({ title, subtitle }) => {
  const navigate = useNavigate();
  const [casesData, setCasesData] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assigned_to: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const pageSize = 10;

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const params: Record<string, any> = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
    };
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.assigned_to) params.assigned_to = filters.assigned_to;

    try {
      const data = await cases.getCases(params);
      setCasesData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load cases. Please verify your connection and try again.');
      console.error('Error fetching cases:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleRowClick = (caseItem: Case) => {
    // Navigate to parcel detail page with verification cases tab
    navigate(`/parcels/${caseItem.parcel_id}?tab=cases`);
  };

  const handleUpdateStatus = async (caseId: string, newStatus: Case['status']) => {
    if (updatingIds.has(caseId)) return;
    setUpdatingIds((prev) => new Set(prev).add(caseId));
    setError('');
    try {
      await cases.updateCase(caseId, { status: newStatus });
      setCasesData((prev) =>
        prev.map((c) =>
          c.case_id === caseId
            ? { ...c, status: newStatus, updated_at: new Date().toISOString() }
            : c
        )
      );
      setSuccessFeedback(`Case ${caseId} status changed to ${newStatus.replace('_', ' ')}`);
      setTimeout(() => setSuccessFeedback(null), 3500);
    } catch (err: any) {
      console.error('Failed to update case status:', err);
      setError(err?.message || 'Failed to update case status. Please try again.');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(caseId);
        return next;
      });
    }
  };

  // Client-side search filtering by Case ID, Parcel ID, Title, or Assignee
  const filteredCases = casesData.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.case_id?.toLowerCase().includes(q) ||
      item.parcel_id?.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q) ||
      item.assigned_to?.toLowerCase().includes(q)
    );
  });

  const pageTitle = title || 'Case Management';
  const pageSubtitle = subtitle || 'Manage, track, and adjudicate land disputes and verification proceedings';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-gray-600 mt-1">{pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/officer/resolution')}
            className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Scale className="w-4 h-4" />
            <span>Dispute Resolution Bench</span>
          </button>
          <button
            onClick={fetchCases}
            disabled={isLoading}
            className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Cases"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 animate-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successFeedback}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchCases}
            className="text-xs font-semibold underline hover:no-underline ml-4 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by Case ID, Parcel ID, title..."
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
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Assigned officer..."
              value={filters.assigned_to}
              onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            {(filters.status || filters.priority || filters.assigned_to || searchQuery) && (
              <button
                onClick={() => {
                  setFilters({ status: '', priority: '', assigned_to: '' });
                  setSearchQuery('');
                  setCurrentPage(1);
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parcel ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No cases found</h2>
            <p className="text-gray-600">
              {searchQuery || filters.status || filters.priority || filters.assigned_to
                ? 'No dispute cases match your current filter parameters.'
                : 'There are currently no active verification cases registered.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parcel ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCases.map((caseItem) => {
                    const isUpdating = updatingIds.has(caseItem.case_id);

                    return (
                      <tr
                        key={caseItem.case_id}
                        onClick={() => handleRowClick(caseItem)}
                        className="cursor-pointer hover:bg-gray-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="text-xs text-gray-900 font-mono font-semibold bg-gray-100 px-2 py-0.5 rounded">
                            {caseItem.case_id}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/parcels/${caseItem.parcel_id}`);
                            }}
                            className="text-xs font-mono text-primary-600 hover:text-primary-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                            title="View Parcel Details"
                          >
                            <span>{caseItem.parcel_id}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{caseItem.title}</p>
                          {caseItem.description && (
                            <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">
                              {caseItem.description}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityBadgeClass(caseItem.priority)}`}>
                            {caseItem.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {caseItem.risk_level ? (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getRiskBadgeClass(caseItem.risk_level)}`}>
                              {caseItem.risk_level}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClass(caseItem.status)}`}>
                            {caseItem.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{caseItem.assigned_to || 'Unassigned'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {caseItem.status === 'OPEN' && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateStatus(caseItem.case_id, 'IN_PROGRESS')}
                                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium border border-blue-200 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {isUpdating ? 'Updating...' : 'Start Review'}
                              </button>
                            )}
                            {(caseItem.status === 'OPEN' || caseItem.status === 'IN_PROGRESS') && (
                              <button
                                type="button"
                                onClick={() => navigate('/officer/resolution')}
                                className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-xs font-medium border border-amber-200 transition-colors cursor-pointer flex items-center gap-1"
                                title="Open Resolution Workbench"
                              >
                                <Scale className="w-3 h-3" />
                                <span>Adjudicate</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => navigate(`/parcels/${caseItem.parcel_id}?tab=cases`)}
                              className="px-2.5 py-1 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded text-xs font-medium border border-gray-200 transition-colors cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {currentPage} (up to {pageSize} items per page)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={casesData.length < pageSize}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CasesPage;