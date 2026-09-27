import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cases as casesApi } from '../../api/cases';
import { parcels as parcelsApi } from '../../api/parcels';
import { risk as riskApi } from '../../api/risk';
import { verification as verificationApi } from '../../api/verification';
import { evidence as evidenceApi } from '../../api/evidence';
import type { Case, Parcel, RiskAnalysis, Verification, Evidence, EvidenceType } from '../../types';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  FileText,
  Search,
  RefreshCw,
  Camera,
  Ruler,
  Users,
  Upload,
  Navigation,
  CheckSquare,
  Square,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Briefcase,
  History,
  Layers,
  ChevronRight,
  PlusCircle,
  X,
  User,
  Info,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: 'boundary_markers',
    label: 'Physical Boundary Stones & Pillars',
    description: 'Inspect physical corner stones/pillars on-ground against village cadastral survey map',
    checked: false,
  },
  {
    id: 'khasra_dimensions',
    label: 'Khasra Naksha Area & Perimeter',
    description: 'Verify field measurements and perimeter against recorded Khasra Naksha dimensions',
    checked: false,
  },
  {
    id: 'possession_identity',
    label: 'Current Occupant & Title Verification',
    description: 'Confirm current on-site possession matches recorded revenue titleholder',
    checked: false,
  },
  {
    id: 'adjoining_neighbors',
    label: 'Adjoining Landowners Inquiry',
    description: 'Interview bordering parcel owners regarding boundary demarcation and dispute history',
    checked: false,
  },
  {
    id: 'encroachment_check',
    label: 'Encroachment & Easement Inspection',
    description: 'Inspect for unauthorized permanent/temporary construction or path obstruction',
    checked: false,
  },
  {
    id: 'land_use_check',
    label: 'Classification & Land Use Confirmation',
    description: 'Verify ground land utilization matches registered classification (Agricultural/Non-Agricultural)',
    checked: false,
  },
];

const ACTION_OPTIONS = [
  'Physical On-site Cadastral Survey & Inspection',
  'Boundary Demarcation & Marker Pillar Verification',
  'Title Possession & Occupancy Cross-Check',
  'Joint Revenue & Village Panchayat Inquiry',
  'Encroachment & Easement Rights Survey',
];

const VerificationPage: React.FC = () => {
  const { user } = useAuth();

  // Queue state
  const [casesList, setCasesList] = useState<Case[]>([]);
  const [queueFilter, setQueueFilter] = useState<'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ALL'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  // Active Selected Workspace State
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<string>('');
  const [manualParcelInput, setManualParcelInput] = useState('');
  const [parcelData, setParcelData] = useState<Parcel | null>(null);
  const [riskData, setRiskData] = useState<RiskAnalysis | null>(null);
  const [historyList, setHistoryList] = useState<Verification[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);

  // Verification Form State
  const [actionTaken, setActionTaken] = useState(ACTION_OPTIONS[0]);
  const [notes, setNotes] = useState('');
  const [verificationOutcome, setVerificationOutcome] = useState<'COMPLETED' | 'REQUIRES_FURTHER_INVESTIGATION' | 'REJECTED'>('COMPLETED');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Evidence Form State (Modal / Inline)
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('SITE_PHOTO');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceFilePreview, setEvidenceFilePreview] = useState<string>('');
  const [evidenceFileName, setEvidenceFileName] = useState<string>('');
  const [evidenceLatitude, setEvidenceLatitude] = useState<string>('');
  const [evidenceLongitude, setEvidenceLongitude] = useState<string>('');
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceMsg, setEvidenceMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch Cases for the Officer's Verification Queue
  const fetchQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    try {
      const params: any = {};
      if (queueFilter !== 'ALL') {
        params.status = queueFilter;
      }
      const data = await casesApi.getCases(params);
      setCasesList(data);

      // Auto-select first case if none selected or if active case is no longer present
      if (data.length > 0 && !selectedCase && !selectedParcelId) {
        handleSelectCase(data[0]);
      }
    } catch (err) {
      console.error('Failed to load verification queue:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  }, [queueFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // 2. Load Details for Selected Case / Parcel
  const loadWorkspaceDetails = useCallback(async (parcelId: string, caseId?: string) => {
    if (!parcelId) return;
    setIsLoadingDetails(true);
    setSubmitSuccess(null);
    setSubmitError(null);

    try {
      // Parallel fetches for parcel, risk, verification history, and evidence
      const [pRes, rRes, hRes, eRes] = await Promise.allSettled([
        parcelsApi.getParcel(parcelId),
        riskApi.getRiskAnalysis(parcelId),
        verificationApi.getVerifications(parcelId),
        caseId ? evidenceApi.getEvidenceByCase(caseId) : evidenceApi.getAllEvidence({ parcel_id: parcelId }),
      ]);

      if (pRes.status === 'fulfilled') {
        setParcelData(pRes.value);
        if (pRes.value.latitude && pRes.value.longitude) {
          setEvidenceLatitude(pRes.value.latitude.toString());
          setEvidenceLongitude(pRes.value.longitude.toString());
        }
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
      console.error('Error fetching workspace details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // When selectedCase or selectedParcelId changes, reload details
  useEffect(() => {
    if (selectedParcelId) {
      loadWorkspaceDetails(selectedParcelId, selectedCase?.case_id);
    }
  }, [selectedParcelId, selectedCase, loadWorkspaceDetails]);

  // Handler for case selection
  const handleSelectCase = (c: Case) => {
    setSelectedCase(c);
    setSelectedParcelId(c.parcel_id);
    setManualParcelInput('');
    setChecklist(DEFAULT_CHECKLIST.map((item) => ({ ...item, checked: false })));
    setNotes('');
    setSubmitSuccess(null);
    setSubmitError(null);
  };

  // Handler for manual parcel lookup
  const handleManualParcelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualParcelInput.trim()) return;
    const pid = manualParcelInput.trim().toUpperCase();
    setSelectedCase(null);
    setSelectedParcelId(pid);
    setChecklist(DEFAULT_CHECKLIST.map((item) => ({ ...item, checked: false })));
    setNotes('');
  };

  // Checklist toggle
  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleCheckAll = (checked: boolean) => {
    setChecklist((prev) => prev.map((item) => ({ ...item, checked })));
  };

  const completedChecksCount = checklist.filter((c) => c.checked).length;
  const checklistPercent = Math.round((completedChecksCount / checklist.length) * 100);

  // Evidence file upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEvidenceFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidenceFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // GPS Location handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setEvidenceMsg({ type: 'error', text: 'Geolocation is not supported by your browser' });
      return;
    }
    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEvidenceLatitude(pos.coords.latitude.toFixed(6));
        setEvidenceLongitude(pos.coords.longitude.toFixed(6));
        setIsCapturingGps(false);
      },
      (err) => {
        console.error('GPS error:', err);
        setEvidenceMsg({ type: 'error', text: 'Unable to retrieve GPS coordinates.' });
        setIsCapturingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Submit Evidence
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcelId) {
      setEvidenceMsg({ type: 'error', text: 'No parcel selected' });
      return;
    }

    setIsSubmittingEvidence(true);
    setEvidenceMsg(null);

    try {
      const officer = user?.full_name || user?.username || 'FIELD_PATWARI';
      const lat = evidenceLatitude ? parseFloat(evidenceLatitude) : undefined;
      const lng = evidenceLongitude ? parseFloat(evidenceLongitude) : undefined;

      const newEv = await evidenceApi.createEvidence({
        parcel_id: selectedParcelId,
        case_id: selectedCase?.case_id || 'FIELD_INSPECTION',
        evidence_type: evidenceType,
        file_url: evidenceFilePreview || undefined,
        geo_coordinates: lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : undefined,
        notes: evidenceNotes || undefined,
        uploaded_by: officer,
      });

      setEvidenceList((prev) => [newEv, ...prev]);
      setEvidenceMsg({ type: 'success', text: 'Evidence recorded and linked to verification case successfully!' });

      // Reset evidence form fields
      setEvidenceNotes('');
      setEvidenceFilePreview('');
      setEvidenceFileName('');
      setTimeout(() => {
        setShowEvidenceModal(false);
        setEvidenceMsg(null);
      }, 1500);
    } catch (err: any) {
      console.error('Evidence submission failed:', err);
      setEvidenceMsg({
        type: 'error',
        text: err?.error?.message || 'Failed to submit evidence. Please try again.',
      });
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  // Submit Verification
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcelId) {
      setSubmitError('Please select a parcel or case to verify.');
      return;
    }
    if (!notes.trim()) {
      setSubmitError('Field observation notes are required to document the verification outcome.');
      return;
    }

    setIsSubmittingVerification(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const officer = user?.full_name || user?.username || 'FIELD_PATWARI';

      // Compile checklist summary into notes
      const checklistSummary = `\n\n[Field Checklist (${completedChecksCount}/${checklist.length} Completed)]:\n` +
        checklist.map((c) => `- [${c.checked ? 'X' : ' '}] ${c.label}`).join('\n');

      const fullNotes = notes.trim() + checklistSummary;

      const res = await verificationApi.submitVerification({
        parcel_id: selectedParcelId,
        case_id: selectedCase?.case_id,
        action_taken: actionTaken,
        notes: fullNotes,
        status: verificationOutcome,
        verified_by: officer,
      });

      setSubmitSuccess(
        `Verification logged successfully (${res.verification_id}). Status: ${res.status}` +
          (verificationOutcome === 'COMPLETED' ? ' — Case resolved and Parcel marked as VERIFIED.' : ' — Case updated for further review.')
      );

      // Refresh workspace data & queue
      loadWorkspaceDetails(selectedParcelId, selectedCase?.case_id);
      fetchQueue();
    } catch (err: any) {
      console.error('Verification submission failed:', err);
      setSubmitError(err?.error?.message || 'Failed to submit verification. Please check backend connection.');
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  // Filter cases queue by search query
  const filteredCases = casesList.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.case_id.toLowerCase().includes(q) ||
      c.parcel_id.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.assigned_to && c.assigned_to.toLowerCase().includes(q))
    );
  });

  // Helpers for Badges
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
      case 'COMPLETED':
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {status}</span>;
      case 'REQUIRES_VERIFICATION':
      case 'REQUIRES_FURTHER_INVESTIGATION':
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3 h-3" /> {status.replace(/_/g, ' ')}</span>;
      case 'DISPUTED':
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> {status}</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{status}</span>;
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold tracking-wider uppercase mb-1">
            <Shield className="w-4 h-4" /> Member 3 Field Verification Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Revenue Officer Verification Desk</h1>
          <p className="text-emerald-100/80 text-sm mt-1 max-w-2xl">
            Conduct on-ground cadastral verifications, cross-check risk signals, record geo-tagged evidence, and resolve discrepancy cases.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 self-start md:self-auto">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-emerald-200">Logged Officer</div>
            <div className="text-sm font-bold text-white">{user?.full_name || user?.username || 'Field Patwari'}</div>
            <div className="text-xs text-emerald-300 capitalize">{user?.role || 'Patwari'} Jurisdiction</div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout: Queue (Left) + Verification Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assigned Tasks / Queue (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Queue Header & Filters */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-700" />
                  <h2 className="font-bold text-gray-900 text-base">Verification Queue</h2>
                </div>
                <button
                  onClick={fetchQueue}
                  disabled={isLoadingQueue}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
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
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Parcel Lookup */}
            <form onSubmit={handleManualParcelSubmit} className="p-3 bg-emerald-50/50 border-b border-gray-100 flex gap-2">
              <input
                type="text"
                placeholder="Or verify Parcel ID directly..."
                value={manualParcelInput}
                onChange={(e) => setManualParcelInput(e.target.value)}
                className="flex-1 px-3 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono uppercase focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition"
              >
                Inspect
              </button>
            </form>

            {/* Cases List */}
            <div className="divide-y divide-gray-100 max-h-[580px] overflow-y-auto">
              {isLoadingQueue ? (
                <div className="p-8 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  <p className="text-xs">Loading assigned verification cases...</p>
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium text-gray-600">No cases in queue</p>
                  <p className="text-xs text-gray-400 mt-1">Try changing filter or enter a parcel ID above.</p>
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
                          ? 'bg-emerald-50/90 border-l-4 border-emerald-600 pl-2.5'
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
                          <span className="font-mono text-emerald-800 font-semibold">{c.parcel_id}</span>
                          <span>•</span>
                          <span>{formatDate(c.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {getStatusBadge(c.status)}
                        <ChevronRight className={`w-4 h-4 text-gray-400 ${isSelected ? 'text-emerald-700 font-bold' : ''}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Verification Workspace (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedParcelId ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-base font-semibold text-gray-700">Select a Verification Task</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                Choose an assigned case from the queue on the left or enter a parcel ID to open the field inspection workspace.
              </p>
            </div>
          ) : (
            <>
              {/* Workspace Header / Banner */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ACTIVE VERIFICATION
                    </span>
                    {selectedCase ? (
                      <span className="font-mono text-xs text-gray-500">{selectedCase.case_id}</span>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Direct Parcel Inspection</span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {selectedCase?.title || `Field Verification for Parcel ${selectedParcelId}`}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>Parcel ID: <strong className="text-gray-800 font-mono">{selectedParcelId}</strong></span>
                    {selectedCase?.assigned_to && (
                      <>
                        <span>•</span>
                        <span>Assigned to: <strong className="text-gray-800">{selectedCase.assigned_to}</strong></span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadWorkspaceDetails(selectedParcelId, selectedCase?.case_id)}
                    disabled={isLoadingDetails}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDetails ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={() => setShowEvidenceModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-sm transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Attach Evidence
                  </button>
                </div>
              </div>

              {/* Feedback Banners */}
              {submitSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm flex items-start gap-3 shadow-sm animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Verification Submitted</div>
                    <p className="text-xs text-emerald-800 mt-0.5">{submitSuccess}</p>
                  </div>
                </div>
              )}

              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm flex items-start gap-3 shadow-sm animate-fadeIn">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Action Failed</div>
                    <p className="text-xs text-red-800 mt-0.5">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Section 1: Parcel Information & Risk Profile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Parcel Information Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-700" />
                        <h3 className="font-bold text-gray-900 text-sm">Parcel Information</h3>
                      </div>
                      {parcelData && getStatusBadge(parcelData.status)}
                    </div>

                    {isLoadingDetails && !parcelData ? (
                      <div className="py-8 text-center text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-1" />
                        <span className="text-xs">Fetching parcel registry...</span>
                      </div>
                    ) : parcelData ? (
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                        <div>
                          <span className="text-gray-400 block">Survey / Khasra No.</span>
                          <span className="font-bold text-gray-800 font-mono text-sm">{parcelData.survey_number}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Owner of Record</span>
                          <span className="font-bold text-gray-800">{parcelData.owner_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Land Area</span>
                          <span className="font-semibold text-gray-800">{parcelData.area} Acres</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Classification</span>
                          <span className="font-semibold text-gray-800">{parcelData.land_type}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-400 block">Location Jurisdiction</span>
                          <span className="text-gray-700">
                            Village: <strong>{parcelData.village}</strong>, Tehsil: <strong>{parcelData.tehsil}</strong>, District: <strong>{parcelData.district}</strong>
                          </span>
                        </div>
                        {parcelData.latitude && parcelData.longitude && (
                          <div className="col-span-2 flex items-center gap-1.5 text-gray-500 font-mono text-[11px] bg-gray-50 px-2.5 py-1 rounded">
                            <Navigation className="w-3 h-3 text-emerald-600" />
                            GPS: {parcelData.latitude}, {parcelData.longitude}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-amber-600">
                        Parcel record not found in database.
                      </div>
                    )}
                  </div>
                </div>

                {/* Risk Reasons & Signals Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <h3 className="font-bold text-gray-900 text-sm">Risk Assessment & Signals</h3>
                      </div>
                      {riskData && getRiskBadge(riskData.level)}
                    </div>

                    {isLoadingDetails && !riskData ? (
                      <div className="py-8 text-center text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-500 mb-1" />
                        <span className="text-xs">Computing risk metrics...</span>
                      </div>
                    ) : riskData ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg">
                          <div>
                            <span className="text-[11px] text-gray-400 uppercase font-semibold block">Risk Score</span>
                            <span className="text-lg font-extrabold text-gray-900">{riskData.score} / 100</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-gray-400 uppercase font-semibold block">Risk Trend</span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-700">
                              {riskData.trend === 'INCREASING' && <TrendingUp className="w-4 h-4 text-red-500" />}
                              {riskData.trend === 'DECREASING' && <TrendingDown className="w-4 h-4 text-emerald-500" />}
                              {riskData.trend === 'STABLE' && <Minus className="w-4 h-4 text-gray-400" />}
                              {riskData.trend}
                            </span>
                          </div>
                        </div>

                        {/* Risk Reasons List */}
                        <div>
                          <span className="text-xs font-semibold text-gray-700 block mb-1.5">Flagged Discrepancy Factors:</span>
                          {riskData.reasons && riskData.reasons.length > 0 ? (
                            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                              {riskData.reasons.map((r, i) => (
                                <div key={i} className="flex items-start justify-between text-xs bg-red-50/70 text-red-900 p-2 rounded border border-red-100">
                                  <span>{r.description || r.factor}</span>
                                  {r.impact && <span className="font-mono font-bold text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded ml-2">+{r.impact}%</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 italic">No critical anomalies flagged by AI engine.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-gray-400">
                        No risk analysis record found for this parcel.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Verification Checklist */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-700" />
                      <h3 className="font-bold text-gray-900 text-sm">On-Site Verification Checklist</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Standard operating procedure for ground-truth inspection. Check off items as completed on-site.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      {completedChecksCount} of {checklist.length} Verified ({checklistPercent}%)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCheckAll(completedChecksCount !== checklist.length)}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline"
                    >
                      {completedChecksCount === checklist.length ? 'Clear All' : 'Check All'}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 transition-all duration-300 rounded-full"
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>

                {/* Checklist items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition flex items-start gap-3 select-none ${
                        item.checked
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 focus:outline-none"
                      >
                        {item.checked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <div className="space-y-0.5">
                        <div className={`text-xs font-bold ${item.checked ? 'text-emerald-900' : 'text-gray-900'}`}>
                          {item.label}
                        </div>
                        <div className="text-[11px] text-gray-500 leading-tight">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Attached Field Evidence (Existing Evidence System) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-purple-700" />
                    <h3 className="font-bold text-gray-900 text-sm">Attached Field Evidence</h3>
                    <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                      {evidenceList.length} Records
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEvidenceModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add Evidence
                  </button>
                </div>

                {evidenceList.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <Camera className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-medium text-gray-600">No field evidence attached to this case yet.</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Upload ground photographs, boundary measurements, or witness statements to support verification.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowEvidenceModal(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition"
                    >
                      <Camera className="w-3.5 h-3.5" /> Attach Ground Photo / Measurement
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {evidenceList.map((ev) => (
                      <div
                        key={ev.evidence_id}
                        className="bg-gray-50 rounded-lg border border-gray-200 p-3 flex flex-col justify-between space-y-2 hover:shadow-sm transition"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <span className="font-mono text-gray-500 font-semibold">{ev.evidence_id}</span>
                            <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">
                              {ev.evidence_type.replace('_', ' ')}
                            </span>
                          </div>

                          {ev.file_url ? (
                            <div className="w-full h-28 bg-gray-200 rounded overflow-hidden mb-2 relative group">
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
                                View Full
                              </a>
                            </div>
                          ) : (
                            <div className="w-full h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs mb-2">
                              No image attachment
                            </div>
                          )}

                          {ev.notes && (
                            <p className="text-xs text-gray-700 line-clamp-2 italic mb-1.5">
                              "{ev.notes}"
                            </p>
                          )}
                        </div>

                        <div className="text-[10px] text-gray-500 border-t border-gray-200/80 pt-1.5 space-y-0.5">
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

              {/* Section 4: Officer Notes & Verification Decision */}
              <form onSubmit={handleSubmitVerification} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
                <div className="border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                    <h3 className="font-bold text-gray-900 text-base">Record Verification & Finalize Case</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select action conducted, record detailed explainable observations, and choose verification outcome.
                  </p>
                </div>

                {/* Action Taken */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Action Performed on Ground:
                  </label>
                  <select
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {ACTION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700">
                      Field Observation Notes & Justification <span className="text-red-500">*</span>:
                    </label>
                    <span className="text-[11px] text-gray-400">
                      Checklist summary will be automatically appended upon submission.
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter comprehensive findings from the field inspection (e.g., physical boundary stones intact, matched survey coordinates, no unauthorized encroachment detected, interviewed adjoining neighbor Shri Ram Lal who confirmed boundary possession)..."
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                {/* Verification Outcome Decision Cards */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Verification Outcome Decision:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Option 1: COMPLETED */}
                    <div
                      onClick={() => setVerificationOutcome('COMPLETED')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        verificationOutcome === 'COMPLETED'
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-sm'
                          : 'border-gray-200 hover:border-emerald-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Outcome 1</span>
                          <CheckCircle2 className={`w-5 h-5 ${verificationOutcome === 'COMPLETED' ? 'text-emerald-600' : 'text-gray-300'}`} />
                        </div>
                        <h4 className="text-sm font-extrabold text-gray-900">VERIFIED & CLEARED</h4>
                        <p className="text-[11px] text-gray-600 leading-tight">
                          Inspection confirms legitimate ownership & boundary validity. Resolves case & updates parcel to VERIFIED.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded mt-3 self-start">
                        COMPLETED
                      </span>
                    </div>

                    {/* Option 2: REQUIRES_FURTHER_INVESTIGATION */}
                    <div
                      onClick={() => setVerificationOutcome('REQUIRES_FURTHER_INVESTIGATION')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        verificationOutcome === 'REQUIRES_FURTHER_INVESTIGATION'
                          ? 'border-amber-500 bg-amber-50/80 text-amber-950 shadow-sm'
                          : 'border-gray-200 hover:border-amber-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Outcome 2</span>
                          <Clock className={`w-5 h-5 ${verificationOutcome === 'REQUIRES_FURTHER_INVESTIGATION' ? 'text-amber-600' : 'text-gray-300'}`} />
                        </div>
                        <h4 className="text-sm font-extrabold text-gray-900">FURTHER REVIEW REQUIRED</h4>
                        <p className="text-[11px] text-gray-600 leading-tight">
                          Discrepancies or conflicting boundary claims found. Escalates case to Tehsildar for formal dispute hearing.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded mt-3 self-start">
                        REQUIRES INVESTIGATION
                      </span>
                    </div>

                    {/* Option 3: REJECTED */}
                    <div
                      onClick={() => setVerificationOutcome('REJECTED')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        verificationOutcome === 'REJECTED'
                          ? 'border-red-600 bg-red-50/80 text-red-950 shadow-sm'
                          : 'border-gray-200 hover:border-red-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-red-700">Outcome 3</span>
                          <XCircle className={`w-5 h-5 ${verificationOutcome === 'REJECTED' ? 'text-red-600' : 'text-gray-300'}`} />
                        </div>
                        <h4 className="text-sm font-extrabold text-gray-900">FLAGGED / DISPUTED</h4>
                        <p className="text-[11px] text-gray-600 leading-tight">
                          Confirmed illegal encroachment or fraudulent documentation. Flags parcel status as DISPUTED.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-red-800 bg-red-100/60 px-2 py-0.5 rounded mt-3 self-start">
                        REJECTED
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Signing Officer: <strong className="text-gray-800">{user?.full_name || user?.username || 'FIELD_PATWARI'}</strong>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingVerification}
                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingVerification ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Submitting Verification...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Submit Field Verification Record
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Section 5: Verification History for Parcel / Case */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-bold text-gray-900 text-sm">Verification History</h3>
                    <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                      {historyList.length} Logged
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">Chronological verification audit trail</span>
                </div>

                {historyList.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-lg">
                    <Clock className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                    <p className="text-xs font-medium text-gray-500">No prior verification logs found for this parcel.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyList.map((ver) => (
                      <div
                        key={ver.verification_id}
                        className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-800">{ver.verification_id}</span>
                            {getStatusBadge(ver.status)}
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
                          {ver.action_taken}
                        </div>

                        <p className="text-xs text-gray-700 bg-white p-2.5 rounded-lg border border-gray-100 whitespace-pre-line leading-relaxed font-sans">
                          {ver.notes}
                        </p>

                        <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1">
                          <span>Verified By: <strong className="text-gray-700">{ver.verified_by}</strong></span>
                          <span className="text-emerald-700 font-medium">Immutable Registry Event</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Attach Evidence Modal Dialog */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden space-y-4">
            <div className="p-4 bg-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <h3 className="font-bold text-base">Attach Field Ground Evidence</h3>
              </div>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="p-1 rounded-lg hover:bg-white/20 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence} className="p-5 space-y-4">
              {evidenceMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    evidenceMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {evidenceMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{evidenceMsg.text}</span>
                </div>
              )}

              {/* Evidence Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Evidence Type:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { type: 'SITE_PHOTO', label: 'Site Photo', icon: Camera },
                      { type: 'BOUNDARY_MEASUREMENT', label: 'Measurement', icon: Ruler },
                      { type: 'WITNESS_RECORD', label: 'Witness', icon: Users },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setEvidenceType(item.type)}
                        className={`py-2 px-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition ${
                          evidenceType === item.type
                            ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-sm'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File / Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Upload Photo or Survey File:
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 text-center hover:bg-gray-50 transition relative">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {evidenceFilePreview ? (
                    <div className="space-y-1">
                      <img
                        src={evidenceFilePreview}
                        alt="Preview"
                        className="h-24 mx-auto object-contain rounded"
                      />
                      <span className="text-[11px] text-emerald-700 font-semibold block">{evidenceFileName}</span>
                    </div>
                  ) : (
                    <div className="text-gray-400 space-y-1">
                      <Upload className="w-6 h-6 mx-auto text-gray-400" />
                      <span className="text-xs block font-medium text-gray-600">Click or drag file to attach</span>
                      <span className="text-[10px] text-gray-400 block">PNG, JPG, PDF up to 10MB</span>
                    </div>
                  )}
                </div>
              </div>

              {/* GPS Coordinates */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">Geo Coordinates (Optional):</label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isCapturingGps}
                    className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                  >
                    <Navigation className={`w-3 h-3 ${isCapturingGps ? 'animate-spin' : ''}`} />
                    {isCapturingGps ? 'Locating...' : 'Use My GPS Location'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Latitude (e.g. 28.6139)"
                    value={evidenceLatitude}
                    onChange={(e) => setEvidenceLatitude(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Longitude (e.g. 77.2090)"
                    value={evidenceLongitude}
                    onChange={(e) => setEvidenceLongitude(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Evidence Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Field Evidence Description:</label>
                <textarea
                  rows={2}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="e.g. Photo of northern boundary pillar with adjacent village road marker..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEvidence}
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingEvidence ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving Evidence...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Save & Link Evidence
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

export default VerificationPage;