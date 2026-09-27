import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { parcels } from '../../api/parcels';
import type { Parcel, ParcelEvent } from '../../types';
import ParcelTimeline from '../../components/parcels/ParcelTimeline';
import ParcelMap from '../../components/parcels/ParcelMap';
import DocumentUpload from '../../components/documents/DocumentUpload';
import DocumentList from '../../components/documents/DocumentList';
import RiskDashboard from '../../components/risk/RiskDashboard';
import VerificationTab from '../../components/verification/VerificationTab';
import { generateParcelPDFReport } from '../../utils/pdfGenerator';
import {
  MapPin,
  ChevronLeft,
  Calendar,
  Layers,
  Flag,
  FileText,
  Activity,
  ShieldAlert,
  Loader2,
  User,
  Plus,
  Upload,
  Download,
  Shield,
} from 'lucide-react';

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'VERIFIED':
      return 'bg-green-100 text-green-800';
    case 'REQUIRES_VERIFICATION':
      return 'bg-yellow-100 text-yellow-800';
    case 'DISPUTED':
      return 'bg-red-100 text-red-800';
    case 'IN_REVIEW':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatArea = (area: number): string => {
  return `${area.toLocaleString()} sq m`;
};

const ParcelDetailPage: React.FC = () => {
  const { parcel_id } = useParams<{ parcel_id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [timeline, setTimeline] = useState<ParcelEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'risk' | 'cases'>('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isInitiatingVerification, setIsInitiatingVerification] = useState(false);

  useEffect(() => {
    const fetchParcelData = async () => {
      if (!parcel_id) return;

      setIsLoading(true);
      setError('');

      try {
        const [parcelData, timelineData] = await Promise.all([
          parcels.getParcel(parcel_id),
          parcels.getTimeline(parcel_id),
        ]);
        setParcel(parcelData);
        setTimeline(timelineData);
      } catch (err) {
        setError('Failed to load parcel details. Please try again.');
        console.error('Error fetching parcel details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParcelData();
  }, [parcel_id]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'cases') {
      setActiveTab('cases');
    }
  }, [searchParams]);

  const handleDocumentUploaded = () => {
    setShowUploadModal(false);
    // The DocumentList will refetch on its own or we could trigger a refresh
  };

  const handleExportReport = async () => {
    if (!parcel_id || !parcel) return;

    setIsExporting(true);
    try {
      const reportData = await parcels.exportReport(parcel_id);
      generateParcelPDFReport({
        parcel: reportData.parcel || parcel,
        timeline: reportData.timeline || timeline,
        documents_count: reportData.documents_count || 0,
        risk_analysis: reportData.risk_analysis || null,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to export PDF report:', err);
      // Fallback to local data PDF generation
      generateParcelPDFReport({
        parcel: parcel,
        timeline: timeline,
        documents_count: 0,
        risk_analysis: null,
        generated_at: new Date().toISOString(),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleInitiateVerification = async () => {
    if (!parcel_id) return;

    if (!confirm('Are you sure you want to initiate a verification process for this parcel?')) {
      return;
    }

    setIsInitiatingVerification(true);
    try {
      const result = await parcels.initiateVerification(parcel_id);
      alert(`Verification initiated successfully! Case ID: ${result.case_id}`);

      // Refresh parcel data to show updated status
      const updatedParcel = await parcels.getParcel(parcel_id);
      setParcel(updatedParcel);

      // Optionally switch to cases tab
      setActiveTab('cases');
    } catch (err) {
      console.error('Failed to initiate verification:', err);
      alert('Failed to initiate verification. Please try again.');
    } finally {
      setIsInitiatingVerification(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Loading parcel details...</p>
        </div>
      </div>
    );
  }

  if (error || !parcel) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/parcels')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Parcels
        </button>
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-red-600 mb-4">{error || 'Parcel not found'}</p>
          <button
            onClick={() => navigate('/parcels')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate('/parcels')}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Parcels
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </>
            )}
          </button>
          <button
            onClick={handleInitiateVerification}
            disabled={isInitiatingVerification || parcel?.status === 'IN_REVIEW'}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInitiatingVerification ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initiating...</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Initiate Verification</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-gray-50 to-white">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Parcel <span className="text-blue-600">{parcel.parcel_id}</span>
              </h1>
              <span
                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider shadow-sm ${getStatusBadgeClass(
                  parcel.status
                )}`}
              >
                {parcel.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-gray-500 flex items-center mt-1">
              <MapPin className="w-4 h-4 mr-2" />
              {parcel.village}, {parcel.tehsil}, {parcel.district}
            </p>
          </div>
          <div className="flex gap-8 text-right bg-white p-4 rounded-xl shadow-sm border border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Survey Number</p>
              <p className="text-xl font-bold text-gray-900">{parcel.survey_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Area</p>
              <p className="text-xl font-bold text-gray-900">{formatArea(parcel.area)}</p>
            </div>
          </div>
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 sm:p-8 bg-white border-t border-gray-100">
          <div className="flex items-start">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-4">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Registered Owner</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">{parcel.owner_name}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg mr-4">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Land Type</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5 capitalize">{parcel.land_type}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg mr-4">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Registered On</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">
                {new Date(parcel.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg mr-4">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Last Updated</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">
                {new Date(parcel.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm rounded-xl overflow-hidden sticky top-4 z-10">
        <nav className="flex space-x-1 p-1 bg-gray-50" aria-label="Tabs">
          {[
            { id: 'overview', icon: MapPin, label: 'Overview & Timeline' },
            { id: 'documents', icon: FileText, label: 'Documents & AI' },
            { id: 'risk', icon: Activity, label: 'Risk Intelligence' },
            { id: 'cases', icon: ShieldAlert, label: 'Active Cases' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                } group flex-1 flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg transition-all`}
              >
                <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Map */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                    Geospatial Extent
                  </h3>
                  {parcel.latitude && parcel.longitude && (
                    <span className="text-sm text-gray-500 font-mono">
                      {parcel.latitude.toFixed(6)}, {parcel.longitude.toFixed(6)}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <ParcelMap
                    latitude={parcel.latitude}
                    longitude={parcel.longitude}
                    parcelId={parcel.parcel_id}
                    riskLevel={parcel.risk_level || 'LOW'}
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
                <p className="text-sm text-gray-500 mt-1">Recent events and updates</p>
              </div>
              <div className="p-4 sm:p-6 max-h-[600px] overflow-y-auto">
                <ParcelTimeline events={timeline} />
              </div>
            </div>
          </div>
        )}

        {/* Placeholders for other tabs */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Header with Upload Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Documents & AI Extraction</h2>
                <p className="text-gray-600 mt-1">
                  Upload and review land records, deeds, and AI-extracted cadastral data.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Upload Document</span>
                <Upload className="w-4 h-4 sm:hidden" />
              </button>
            </div>

            {/* Document List */}
            <DocumentList
              parcelId={parcel_id!}
            />
          </div>
        )}

        {activeTab === 'risk' && (
          <RiskDashboard parcelId={parcel_id!} />
        )}

        {activeTab === 'cases' && (
          <VerificationTab parcelId={parcel_id!} />
        )}
      </div>

      {/* Document Upload Modal */}
      {showUploadModal && (
        <DocumentUpload
          parcelId={parcel_id!}
          onSuccess={handleDocumentUploaded}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
};

export default ParcelDetailPage;