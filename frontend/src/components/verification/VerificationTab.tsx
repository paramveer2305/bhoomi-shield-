import React, { useState, useEffect, useCallback } from 'react';
import { cases } from '../../api/cases';
import { verification } from '../../api/verification';
import type { Case, Verification } from '../../types';
import {
  Briefcase,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  User,
  X,
  ChevronDown,
  Shield,
} from 'lucide-react';

interface VerificationTabProps {
  parcelId: string;
}

const statusOptions = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'REQUIRES_FURTHER_INVESTIGATION', label: 'Requires Further Investigation' },
];

const actionOptions = [
  'Physical On-site Inspection',
  'Revenue Office Cross-Check',
  'Document Verification',
  'Neighbor Inquiry',
  'Survey Verification',
  'Registry Cross-Reference',
];

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    case 'REQUIRES_FURTHER_INVESTIGATION':
      return 'bg-yellow-100 text-yellow-800';
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
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getCaseStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'OPEN':
      return 'bg-red-100 text-red-800';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800';
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

const VerificationTab: React.FC<VerificationTabProps> = ({ parcelId }) => {
  const [casesData, setCasesData] = useState<Case[]>([]);
  const [verificationsData, setVerificationsData] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateCase, setShowCreateCase] = useState(false);
  const [showLogVerification, setShowLogVerification] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [expandedVerificationId, setExpandedVerificationId] = useState<string | null>(null);

  // Create Case Form State
  const [createCaseForm, setCreateCaseForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as Case['priority'],
    assigned_to: '',
  });
  const [isCreatingCase, setIsCreatingCase] = useState(false);

  // Log Verification Form State
  const [logVerificationForm, setLogVerificationForm] = useState({
    case_id: '',
    action_taken: '',
    notes: '',
    status: 'COMPLETED' as Verification['status'],
  });
  const [isLoggingVerification, setIsLoggingVerification] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [casesRes, verificationsRes] = await Promise.all([
        cases.getCases({ parcel_id: parcelId }),
        verification.getVerifications(parcelId),
      ]);
      setCasesData(casesRes);
      setVerificationsData(verificationsRes);
    } catch (err) {
      setError('Failed to load verification data. Please try again.');
      console.error('Error fetching verification data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [parcelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsCreatingCase(true);

    try {
      await cases.createCase({
        parcel_id: parcelId,
        status: 'OPEN',
        ...createCaseForm,
      });
      setShowCreateCase(false);
      setCreateCaseForm({ title: '', description: '', priority: 'MEDIUM', assigned_to: '' });
      fetchData();
    } catch (err) {
      setError('Failed to create case. Please try again.');
      console.error('Error creating case:', err);
    } finally {
      setIsCreatingCase(false);
    }
  };

  const handleLogVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingVerification(true);

    try {
      await verification.submitVerification({
        parcel_id: parcelId,
        ...logVerificationForm,
        verified_by: 'Current Officer', // In real app, get from auth context
      });
      setShowLogVerification(false);
      setLogVerificationForm({ case_id: '', action_taken: '', notes: '', status: 'COMPLETED' });
      fetchData();
    } catch (err) {
      setError('Failed to log verification. Please try again.');
      console.error('Error logging verification:', err);
    } finally {
      setIsLoggingVerification(false);
    }
  };

  const handleUpdateCaseStatus = async (caseId: string, newStatus: Case['status']) => {
    try {
      await cases.updateCase(caseId, { status: newStatus });
      fetchData();
    } catch (err) {
      setError('Failed to update case status. Please try again.');
      console.error('Error updating case status:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="space-y-4">
          <div className="h-24 bg-gray-100 rounded-lg" />
          <div className="h-24 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Verification Cases</h2>
          <p className="text-gray-600 mt-1">
            Manage officer verifications and field investigation records for this parcel.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowLogVerification(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Log Verification
          </button>
          <button
            onClick={() => setShowCreateCase(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Open New Case
          </button>
        </div>
      </div>

      {/* Active Cases Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            Active Cases ({casesData.filter(c => c.status !== 'CLOSED').length})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Cases linked to this parcel. Click to expand details.
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {casesData.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="font-medium text-gray-900 mb-1">No cases found</h4>
              <p className="text-gray-600 mb-4">No verification cases have been opened for this parcel.</p>
              <button
                onClick={() => setShowCreateCase(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Open First Case
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {casesData.map((caseItem) => {
                const isExpanded = expandedCaseId === caseItem.case_id;
                return (
                  <div
                    key={caseItem.case_id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Case Header */}
                    <button
                      onClick={() => setExpandedCaseId(isExpanded ? null : caseItem.case_id)}
                      className="w-full p-4 flex items-center justify-between gap-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{caseItem.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {caseItem.case_id}
                            </span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(caseItem.priority)}`}>
                              {caseItem.priority}
                            </span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getCaseStatusBadgeClass(caseItem.status)}`}>
                              {caseItem.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Expanded Case Details */}
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 bg-white space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Description</p>
                            <p className="text-gray-700 mt-1">{caseItem.description || 'No description provided'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Assigned To</p>
                            <p className="text-gray-700 mt-1">{caseItem.assigned_to || 'Unassigned'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Risk Level</p>
                            <p className="text-gray-700 mt-1">
                              {caseItem.risk_level ? (
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(caseItem.risk_level)}`}>
                                  {caseItem.risk_level}
                                </span>
                              ) : (
                                'Not assessed'
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Created</p>
                            <p className="text-gray-700 mt-1">{formatDate(caseItem.created_at)}</p>
                          </div>
                        </div>

                        {/* Case Actions */}
                        {caseItem.status !== 'CLOSED' && caseItem.status !== 'RESOLVED' && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                            <button
                              onClick={() => handleUpdateCaseStatus(caseItem.case_id, 'IN_PROGRESS')}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Start Investigation
                            </button>
                            <button
                              onClick={() => handleUpdateCaseStatus(caseItem.case_id, 'RESOLVED')}
                              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Mark Resolved
                            </button>
                            <button
                              onClick={() => handleUpdateCaseStatus(caseItem.case_id, 'CLOSED')}
                              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Close Case
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Verification History Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Verification History ({verificationsData.length})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Officer verification logs and field investigation records.
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {verificationsData.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="font-medium text-gray-900 mb-1">No verification logs</h4>
              <p className="text-gray-600 mb-4">No officer verifications have been recorded for this parcel.</p>
              <button
                onClick={() => setShowLogVerification(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Log First Verification
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {verificationsData.map((verification) => {
                const isExpanded = expandedVerificationId === verification.verification_id;
                return (
                  <div
                    key={verification.verification_id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Verification Header */}
                    <button
                      onClick={() => setExpandedVerificationId(isExpanded ? null : verification.verification_id)}
                      className="w-full p-4 flex items-center justify-between gap-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg flex-shrink-0">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{verification.action_taken}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {verification.verified_by}
                            </span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(verification.status)}`}>
                              {verification.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{formatDate(verification.timestamp)}</span>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Expanded Verification Details */}
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 bg-white space-y-4">
                        {verification.notes && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Officer Notes</p>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{verification.notes}</p>
                          </div>
                        )}
                        {verification.case_id && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Linked Case</p>
                            <p className="text-gray-700 mt-1 font-mono">{verification.case_id}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(verification.timestamp)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Case Modal */}
      {showCreateCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Open New Case</h2>
              <button
                onClick={() => setShowCreateCase(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="case_title" className="block text-sm font-medium text-gray-700 mb-1">
                  Case Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="case_title"
                  type="text"
                  required
                  value={createCaseForm.title}
                  onChange={(e) => setCreateCaseForm({ ...createCaseForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter case title"
                />
              </div>

              <div>
                <label htmlFor="case_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="case_description"
                  value={createCaseForm.description}
                  onChange={(e) => setCreateCaseForm({ ...createCaseForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Describe the issue requiring investigation"
                />
              </div>

              <div>
                <label htmlFor="case_priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  id="case_priority"
                  required
                  value={createCaseForm.priority}
                  onChange={(e) => setCreateCaseForm({ ...createCaseForm, priority: e.target.value as Case['priority'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label htmlFor="case_assigned_to" className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <input
                  id="case_assigned_to"
                  type="text"
                  value={createCaseForm.assigned_to}
                  onChange={(e) => setCreateCaseForm({ ...createCaseForm, assigned_to: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Officer name or ID"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCase(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCase}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreatingCase ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Case
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Verification Modal */}
      {showLogVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Log Verification Action</h2>
              <button
                onClick={() => setShowLogVerification(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleLogVerification} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="verification_case_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Linked Case (Optional)
                </label>
                <select
                  id="verification_case_id"
                  value={logVerificationForm.case_id}
                  onChange={(e) => setLogVerificationForm({ ...logVerificationForm, case_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">No case linked</option>
                  {casesData
                    .filter(c => c.status !== 'CLOSED')
                    .map((caseItem) => (
                      <option key={caseItem.case_id} value={caseItem.case_id}>
                        {caseItem.title} ({caseItem.case_id})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="verification_action" className="block text-sm font-medium text-gray-700 mb-1">
                  Action Taken <span className="text-red-500">*</span>
                </label>
                <select
                  id="verification_action"
                  required
                  value={logVerificationForm.action_taken}
                  onChange={(e) => setLogVerificationForm({ ...logVerificationForm, action_taken: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select action type</option>
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="verification_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="verification_notes"
                  required
                  value={logVerificationForm.notes}
                  onChange={(e) => setLogVerificationForm({ ...logVerificationForm, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Provide objective, explainable observations from your verification..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Please provide objective, explainable observations. These notes will be part of the official audit trail.
                </p>
              </div>

              <div>
                <label htmlFor="verification_status" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Outcome <span className="text-red-500">*</span>
                </label>
                <select
                  id="verification_status"
                  required
                  value={logVerificationForm.status}
                  onChange={(e) => setLogVerificationForm({ ...logVerificationForm, status: e.target.value as Verification['status'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Note: Selecting "Completed" will automatically resolve the associated case and mark the parcel as "Verified" per backend logic.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogVerification(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingVerification}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoggingVerification ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Logging...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Log Verification
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationTab;