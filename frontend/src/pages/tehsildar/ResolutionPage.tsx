import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cases as casesApi } from '../../api/cases';
import { parcels as parcelsApi } from '../../api/parcels';
import { risk as riskApi } from '../../api/risk';
import { verification as verificationApi } from '../../api/verification';
import { evidence as evidenceApi } from '../../api/evidence';
import type { Case, Parcel, RiskAnalysis, Verification, Evidence } from '../../types';
import {
  Scale,
  Gavel,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MapPin,
  User,
  FileText,
  RefreshCw,
  Search,
  ChevronRight,
  Camera,
  Ruler,
  Users,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  History,
  Briefcase,
  Award,
} from 'lucide-react';

const ResolutionPage: React.FC = () => {
  const { user } = useAuth();

  // Queue state
  const [casesList, setCasesList] = useState<Case[]>([]);
  const [queueFilter, setQueueFilter] = useState<'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ALL'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  // Active Selected Case State
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [manualCaseIdInput, setManualCaseIdInput] = useState('');
  const [parcelData, setParcelData] = useState<Parcel | null>(null);
  const [riskData, setRiskData] = useState<RiskAnalysis | null>(null);
  const [historyList, setHistoryList] = useState<Verification[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Resolution Form State
  const [resolutionStatus, setResolutionStatus] = useState<'RESOLVED' | 'CLOSED'>('RESOLVED');
  const [closingNotes, setClosingNotes] = useState('');
  const [legalRemarks, setLegalRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 1. Fetch Cases for Tehsildar Adjudication Queue
  const fetchQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    try {
      const params: any = {};
      if (queueFilter !== 'ALL') {
        params.status = queueFilter;
      }
      const data = await casesApi.getCases(params);
      setCasesList(data);

      // Auto-select first case if none selected
      if (data.length > 0 && !selectedCase) {
        handleSelectCase(data[0]);
      }
    } catch (err) {
      console.error('Failed to load cases queue:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  }, [queueFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // 2. Load Details for Selected Case
  const loadCaseDetails = useCallback(async (c: Case) => {
    setIsLoadingDetails(true);
    setSubmitSuccess(null);
    setSubmitError(null);

    // Prepopulate closing notes and legal remarks if already resolved
    if (c.closing_notes) {
      setClosingNotes(c.closing_notes);
    } else {
      setClosingNotes('');
    }
    if (c.legal_remarks) {
      setLegalRemarks(c.legal_remarks);
    } else {
      setLegalRemarks('Under MP Land Revenue Code 1959, Section 110 (Dispute Adjudication Order)');
    }
    if (c.status === 'CLOSED') {
      setResolutionStatus('CLOSED');
    } else {
      setResolutionStatus('RESOLVED');
    }

    try {
      // Parallel fetches for parcel, risk, verification history, and evidence
      const [pRes, rRes, hRes, eRes] = await Promise.allSettled([
        parcelsApi.getParcel(c.parcel_id),
        riskApi.getRiskAnalysis(c.parcel_id),
        verificationApi.getVerifications(c.parcel_id),
        evidenceApi.getEvidenceByCase(c.case_id),
      ]);

      if (pRes.status === 'fulfilled') {
        setParcelData(pRes.value);
      } else {
        setParcelData(null);
      }

      if (rRes.status === 'fulfilled') {
        setRiskData(rRes.value);
      } else {
        setRiskData(null);
      }

      if (hRes.status === 'fulfilled') {
        setHistoryList(hRes.value);
      } else {
        setHistoryList([]);
      }

      if (eRes.status === 'fulfilled') {
        setEvidenceList(eRes.value);
      } else {
        setEvidenceList([]);
      }
    } catch (err) {
      console.error('Error fetching case details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // When selectedCase changes, reload workspace details
  useEffect(() => {
    if (selectedCase) {
      loadCaseDetails(selectedCase);
    }
  }, [selectedCase, loadCaseDetails]);

  // Handler for selecting case
  const handleSelectCase = (c: Case) => {
    setSelectedCase(c);
    setManualCaseIdInput('');
    setSubmitSuccess(null);
    setSubmitError(null);
  };

  // Handler for manual case lookup
  const handleManualCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCaseIdInput.trim()) return;
    const cid = manualCaseIdInput.trim().toUpperCase();
    try {
      setIsLoadingDetails(true);
      const c = await casesApi.getCase(cid);
      setSelectedCase(c);
    } catch (err: any) {
      alert(`Case ID '${cid}' not found in database.`);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Handler for submitting case resolution
  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) {
      setSubmitError('No active case selected for resolution.');
      return;
    }
    if (!closingNotes.trim()) {
      setSubmitError('Official closing notes and adjudication terms are required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const officer = user?.full_name || user?.username || 'Tehsildar Adjudicator';

      const updated = await casesApi.resolveCase(selectedCase.case_id, {
        status: resolutionStatus,
        closing_notes: closingNotes.trim(),
        legal_remarks: legalRemarks.trim() || undefined,
        resolved_by: officer,
      });

      setSelectedCase(updated);
      setSubmitSuccess(
        `Case ${updated.case_id} successfully marked as ${updated.status}. Associated active alerts have been resolved, and parcel status updated to VERIFIED.`
      );

      // Refresh case details and queue
      loadCaseDetails(updated);
      fetchQueue();
    } catch (err: any) {
      console.error('Resolution failed:', err);
      setSubmitError(err?.error?.message || 'Failed to submit resolution. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter cases queue
  const filteredCases = casesList.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.case_id.toLowerCase().includes(q) ||
      c.parcel_id.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.assigned_to && c.assigned_to.toLowerCase().includes(q))
    );
  });

  // Badge Helpers
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">URGENT</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">LOW</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> RESOLVED</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1"><Award className="w-3 h-3" /> CLOSED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3 h-3" /> IN PROGRESS</span>;
      case 'OPEN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 flex items-center gap-1"><Scale className="w-3 h-3" /> OPEN</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> HIGH RISK</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> MEDIUM</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> LOW RISK</span>;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isCaseResolved = selectedCase?.status === 'RESOLVED' || selectedCase?.status === 'CLOSED';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-900/40">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold tracking-wider uppercase mb-1">
            <Scale className="w-4 h-4" /> Member 3 Resolution Workflow
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Executive Dispute Resolution Desk</h1>
          <p className="text-indigo-100/80 text-sm mt-1 max-w-2xl">
            Review field inspection reports, cross-examine ground evidence, formulate statutory adjudication decrees, and formally resolve disputes.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 self-start md:self-auto">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-indigo-200">Presiding Officer</div>
            <div className="text-sm font-bold text-white">{user?.full_name || user?.username || 'Tehsildar / Executive Magistrate'}</div>
            <div className="text-xs text-indigo-300 capitalize">{user?.role || 'Tehsildar'} Adjudication Chamber</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Queue (Left 4 cols) + Adjudication Workspace (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Case Queue */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header & Filter Tabs */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-700" />
                  <h2 className="font-bold text-gray-900 text-base">Cases for Hearing</h2>
                </div>
                <button
                  onClick={fetchQueue}
                  disabled={isLoadingQueue}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 transition"
                  title="Refresh cases"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingQueue ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Status Filter Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-gray-200/80 rounded-lg text-xs font-medium text-gray-600 mb-3">
                {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ALL'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setQueueFilter(st)}
                    className={`py-1 rounded text-center transition ${
                      queueFilter === st ? 'bg-white text-gray-900 shadow-sm font-bold' : 'hover:text-gray-900'
                    }`}
                  >
                    {st === 'IN_PROGRESS' ? 'Active' : st === 'ALL' ? 'All' : st}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Case or Parcel ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Case ID Lookup */}
            <form onSubmit={handleManualCaseSubmit} className="p-3 bg-indigo-50/40 border-b border-gray-100 flex gap-2">
              <input
                type="text"
                placeholder="Direct Case ID (e.g. CASE-XXXX)..."
                value={manualCaseIdInput}
                onChange={(e) => setManualCaseIdInput(e.target.value)}
                className="flex-1 px-3 py-1 bg-white border border-indigo-300 rounded-lg text-xs font-mono uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold transition"
              >
                Load
              </button>
            </form>

            {/* Cases List */}
            <div className="divide-y divide-gray-100 max-h-[580px] overflow-y-auto">
              {isLoadingQueue ? (
                <div className="p-8 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs">Loading dispute cases...</p>
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium text-gray-600">No cases found</p>
                  <p className="text-xs text-gray-400 mt-1">Try switching filters or entering a case ID.</p>
                </div>
              ) : (
                filteredCases.map((c) => {
                  const isSelected = selectedCase?.case_id === c.case_id;
                  return (
                    <div
                      key={c.case_id}
                      onClick={() => handleSelectCase(c)}
                      className={`p-3.5 cursor-pointer transition flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-50/90 border-l-4 border-indigo-600 pl-2.5'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-800">{c.case_id}</span>
                          {getPriorityBadge(c.priority)}
                        </div>
                        <h3 className="text-xs font-medium text-gray-900 truncate">{c.title}</h3>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500">
                          <span className="font-mono text-indigo-800 font-semibold">{c.parcel_id}</span>
                          <span>•</span>
                          <span>{formatDate(c.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {getStatusBadge(c.status)}
                        <ChevronRight className={`w-4 h-4 text-gray-400 ${isSelected ? 'text-indigo-700 font-bold' : ''}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Case Details & Resolution Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedCase ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
              <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-base font-semibold text-gray-700">Select a Dispute Case</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                Choose an active case from the hearing queue to inspect parcel records, risk signals, field evidence, and issue resolution orders.
              </p>
            </div>
          ) : (
            <>
              {/* Workspace Header Bar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      DISPUTE ADJUDICATION
                    </span>
                    <span className="font-mono text-xs text-gray-500">{selectedCase.case_id}</span>
                    {getStatusBadge(selectedCase.status)}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedCase.title}</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>Parcel ID: <strong className="text-gray-800 font-mono">{selectedCase.parcel_id}</strong></span>
                    <span>•</span>
                    <span>Assigned: <strong className="text-gray-800">{selectedCase.assigned_to || 'Unassigned'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadCaseDetails(selectedCase)}
                    disabled={isLoadingDetails}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDetails ? 'animate-spin' : ''}`} />
                    Refresh Case Data
                  </button>
                </div>
              </div>

              {/* Feedback Banners */}
              {submitSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm flex items-start gap-3 shadow-sm animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Adjudication Order Executed</div>
                    <p className="text-xs text-emerald-800 mt-0.5">{submitSuccess}</p>
                  </div>
                </div>
              )}

              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm flex items-start gap-3 shadow-sm animate-fadeIn">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Resolution Execution Error</div>
                    <p className="text-xs text-red-800 mt-0.5">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Resolution Status Display (If Already Resolved or Closed) */}
              {isCaseResolved && (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-700" />
                      <h3 className="font-extrabold text-emerald-950 text-sm tracking-wide uppercase">
                        Case Resolution & Closure Certificate
                      </h3>
                    </div>
                    {getStatusBadge(selectedCase.status)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/80 p-3 rounded-lg border border-emerald-200">
                    <div>
                      <span className="text-gray-500 block">Adjudicating Officer:</span>
                      <span className="font-bold text-gray-800">{selectedCase.resolved_by || 'Revenue Officer'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Resolution Date & Time:</span>
                      <span className="font-bold text-gray-800">{formatDate(selectedCase.resolved_at || selectedCase.updated_at)}</span>
                    </div>
                    {selectedCase.legal_remarks && (
                      <div className="sm:col-span-2">
                        <span className="text-gray-500 block">Statutory Reference / Legal Remarks:</span>
                        <span className="font-semibold text-indigo-900">{selectedCase.legal_remarks}</span>
                      </div>
                    )}
                    {selectedCase.closing_notes && (
                      <div className="sm:col-span-2">
                        <span className="text-gray-500 block">Official Closing Notes & Order:</span>
                        <p className="text-gray-800 mt-1 whitespace-pre-wrap font-sans bg-gray-50 p-2.5 rounded border border-gray-200">
                          {selectedCase.closing_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Case Details & Risk Information (Side by Side) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Parcel & Case Profile */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-700" />
                      <h3 className="font-bold text-gray-900 text-sm">Parcel & Title Details</h3>
                    </div>
                    {parcelData && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                        {parcelData.status}
                      </span>
                    )}
                  </div>

                  {parcelData ? (
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-xs">
                      <div>
                        <span className="text-gray-400 block">Survey / Khasra No.</span>
                        <span className="font-bold text-gray-800 font-mono">{parcelData.survey_number}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Owner of Record</span>
                        <span className="font-bold text-gray-800">{parcelData.owner_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Area</span>
                        <span className="font-semibold text-gray-800">{parcelData.area} Acres</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Land Classification</span>
                        <span className="font-semibold text-gray-800">{parcelData.land_type}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400 block">Revenue Jurisdiction</span>
                        <span className="text-gray-700">
                          Village {parcelData.village}, Tehsil {parcelData.tehsil}, Dist. {parcelData.district}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic py-4 text-center">Loading parcel registry...</p>
                  )}

                  {selectedCase.description && (
                    <div className="border-t border-gray-100 pt-2 text-xs">
                      <span className="text-gray-400 block mb-0.5">Case Initiation Notes:</span>
                      <p className="text-gray-700 bg-gray-50 p-2 rounded">{selectedCase.description}</p>
                    </div>
                  )}
                </div>

                {/* Risk Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <h3 className="font-bold text-gray-900 text-sm">Discrepancy & Risk Profile</h3>
                    </div>
                    {riskData && getRiskBadge(riskData.level)}
                  </div>

                  {riskData ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg text-xs">
                        <div>
                          <span className="text-gray-400 block font-semibold">AI Risk Score</span>
                          <span className="text-base font-extrabold text-gray-900">{riskData.score} / 100</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-400 block font-semibold">Risk Trend</span>
                          <span className="inline-flex items-center gap-1 font-bold text-gray-700">
                            {riskData.trend === 'INCREASING' && <TrendingUp className="w-3.5 h-3.5 text-red-500" />}
                            {riskData.trend === 'DECREASING' && <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />}
                            {riskData.trend === 'STABLE' && <Minus className="w-3.5 h-3.5 text-gray-400" />}
                            {riskData.trend}
                          </span>
                        </div>
                      </div>

                      {/* Risk Factors */}
                      <div>
                        <span className="text-xs font-semibold text-gray-700 block mb-1">Flagged Discrepancy Signals:</span>
                        {riskData.reasons && riskData.reasons.length > 0 ? (
                          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                            {riskData.reasons.map((r, i) => (
                              <div key={i} className="text-xs bg-red-50 text-red-900 p-1.5 rounded flex justify-between">
                                <span>{r.description || r.factor}</span>
                                {r.impact && <span className="font-mono font-bold text-[10px] text-red-700 ml-2">+{r.impact}%</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No discrepancy factors flagged.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic py-4 text-center">Loading risk assessment...</p>
                  )}
                </div>
              </div>

              {/* Attached Evidence Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-purple-700" />
                    <h3 className="font-bold text-gray-900 text-sm">Attached Ground Truth Evidence</h3>
                    <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                      {evidenceList.length} Records
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">Ground photos, survey measurements & witness statements</span>
                </div>

                {evidenceList.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-lg">
                    <Camera className="w-7 h-7 mx-auto mb-1 text-gray-300" />
                    <p className="text-xs font-medium text-gray-500">No evidence attached to this case yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {evidenceList.map((ev) => (
                      <div
                        key={ev.evidence_id}
                        className="bg-gray-50 rounded-lg border border-gray-200 p-3 flex flex-col justify-between space-y-2 hover:shadow-sm transition"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-mono text-gray-500 font-semibold">{ev.evidence_id}</span>
                            <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">
                              {ev.evidence_type.replace('_', ' ')}
                            </span>
                          </div>

                          {ev.file_url ? (
                            <div className="w-full h-24 bg-gray-200 rounded overflow-hidden mb-2 relative group">
                              <img
                                src={ev.file_url}
                                alt="Evidence"
                                className="w-full h-full object-cover"
                              />
                              <a
                                href={ev.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-xs font-medium"
                              >
                                View
                              </a>
                            </div>
                          ) : (
                            <div className="w-full h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs mb-2">
                              No image attachment
                            </div>
                          )}

                          {ev.notes && (
                            <p className="text-xs text-gray-700 line-clamp-2 italic mb-1">
                              "{ev.notes}"
                            </p>
                          )}
                        </div>

                        <div className="text-[10px] text-gray-500 border-t border-gray-200/80 pt-1 space-y-0.5">
                          {ev.geo_coordinates && ev.geo_coordinates.latitude && (
                            <div className="flex items-center gap-1 font-mono text-emerald-700 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {ev.geo_coordinates.latitude}, {ev.geo_coordinates.longitude}
                            </div>
                          )}
                          <div className="flex justify-between text-gray-400">
                            <span>By: {ev.uploaded_by}</span>
                            <span>{formatDate(ev.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verification History Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-bold text-gray-900 text-sm">Patwari Field Verification History</h3>
                    <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                      {historyList.length} Logged
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">Field inspections conducted for this parcel</span>
                </div>

                {historyList.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-lg">
                    <Clock className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                    <p className="text-xs font-medium text-gray-500">No field verification logs found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyList.map((ver) => (
                      <div
                        key={ver.verification_id}
                        className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-800">{ver.verification_id}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {ver.status}
                            </span>
                            {ver.case_id && (
                              <span className="font-mono text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                                {ver.case_id}
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 text-[11px]">
                            {formatDate(ver.timestamp)}
                          </div>
                        </div>

                        <div className="text-xs font-semibold text-gray-900">
                          Action: {ver.action_taken}
                        </div>

                        <p className="text-xs text-gray-700 bg-white p-2.5 rounded-lg border border-gray-100 whitespace-pre-line leading-relaxed">
                          {ver.notes}
                        </p>

                        <div className="text-[11px] text-gray-500 pt-0.5">
                          Verified By: <strong className="text-gray-700">{ver.verified_by}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resolution Form (Authorized Officer Form) */}
              <form onSubmit={handleSubmitResolution} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-indigo-700" />
                      <h3 className="font-bold text-gray-900 text-base">Issue Executive Resolution Decree</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Enter statutory remarks and official closing notes to formally resolve or close this case.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                    Magisterial Authority
                  </span>
                </div>

                {/* Resolution Status Choice */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Resolution Status:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setResolutionStatus('RESOLVED')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start justify-between ${
                        resolutionStatus === 'RESOLVED'
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-sm'
                          : 'border-gray-200 hover:border-emerald-300 bg-white'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className={`w-4 h-4 ${resolutionStatus === 'RESOLVED' ? 'text-emerald-600' : 'text-gray-300'}`} />
                          <h4 className="text-xs font-bold text-gray-900">RESOLVE CASE</h4>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-tight">
                          Dispute adjudicated, boundary rectified, and records updated to VERIFIED. Resolves active alerts.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => setResolutionStatus('CLOSED')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start justify-between ${
                        resolutionStatus === 'CLOSED'
                          ? 'border-blue-600 bg-blue-50/80 text-blue-950 shadow-sm'
                          : 'border-gray-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Award className={`w-4 h-4 ${resolutionStatus === 'CLOSED' ? 'text-blue-600' : 'text-gray-300'}`} />
                          <h4 className="text-xs font-bold text-gray-900">CLOSE CASE</h4>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-tight">
                          Formal closure of proceedings; final judgment rendered and archived.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statutory / Legal Remarks */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Legal / Statutory Authority & Reference:
                  </label>
                  <input
                    type="text"
                    value={legalRemarks}
                    onChange={(e) => setLegalRemarks(e.target.value)}
                    placeholder="e.g. Under Section 110, MP Land Revenue Code 1959 / Order Ref: TEH-DISP-2026-99"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Closing Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700">
                      Official Closing Notes & Adjudication Terms <span className="text-red-500">*</span>:
                    </label>
                    <span className="text-[11px] text-gray-400">
                      Immutable record entered into revenue timeline.
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Enter comprehensive adjudication judgment (e.g. Field inspection confirmed boundary stones match village cadastral plan. Disputed area verified to be within surveyed Khasra 108/4. Both parties appeared and signed settlement order. Case stands resolved.)..."
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Signing Magistrate: <strong className="text-gray-800">{user?.full_name || user?.username || 'Tehsildar Adjudicator'}</strong>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Executing Resolution Order...
                      </>
                    ) : (
                      <>
                        <Gavel className="w-4 h-4" />
                        Issue Adjudication & Resolve Case
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResolutionPage;