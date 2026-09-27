import React, { useState, useEffect, useCallback } from 'react';
import { cases } from '../../api/cases';
import { evidence } from '../../api/evidence';
import type { Case, Evidence, EvidenceType } from '../../types';
import {
  Camera,
  Ruler,
  Users,
  MapPin,
  Navigation,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Clock,
  Briefcase,
  ExternalLink,
} from 'lucide-react';

const EVIDENCE_TYPE_OPTIONS: Array<{
  value: EvidenceType;
  label: string;
  description: string;
  icon: typeof Camera;
  color: string;
}> = [
  {
    value: 'SITE_PHOTO',
    label: 'Site Photo',
    description: 'Ground inspection photos, boundary landmarks, encroachments',
    icon: Camera,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    value: 'BOUNDARY_MEASUREMENT',
    label: 'Boundary Measurement',
    description: 'Field survey measurements, Khasra Naksha ground offsets',
    icon: Ruler,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    value: 'WITNESS_RECORD',
    label: 'Witness Record',
    description: 'Statements from adjoining landowners or village panchayat',
    icon: Users,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
];

const getTypeBadge = (type: EvidenceType) => {
  switch (type) {
    case 'SITE_PHOTO':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"><Camera className="w-3 h-3" /> Site Photo</span>;
    case 'BOUNDARY_MEASUREMENT':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><Ruler className="w-3 h-3" /> Measurement</span>;
    case 'WITNESS_RECORD':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Users className="w-3 h-3" /> Witness Record</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{type}</span>;
  }
};

const formatDate = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const EvidencePage: React.FC = () => {
  const [casesList, setCasesList] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Form State
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('SITE_PHOTO');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');

  // 1. Fetch available cases for the dropdown
  useEffect(() => {
    const loadCases = async () => {
      setIsLoadingCases(true);
      try {
        const data = await cases.getCases({ limit: 100 });
        setCasesList(data);
        if (data.length > 0) {
          setSelectedCaseId(data[0].case_id);
        }
      } catch (err) {
        console.error('Failed to load cases:', err);
      } finally {
        setIsLoadingCases(false);
      }
    };
    loadCases();
  }, []);

  // 2. Fetch evidence whenever selectedCaseId changes
  const fetchEvidence = useCallback(async () => {
    if (!selectedCaseId) {
      setEvidenceList([]);
      return;
    }
    setIsLoadingEvidence(true);
    try {
      const data = await evidence.getEvidenceByCase(selectedCaseId);
      setEvidenceList(data);
    } catch (err) {
      console.error('Failed to load evidence for case:', err);
    } finally {
      setIsLoadingEvidence(false);
    }
  }, [selectedCaseId]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  const selectedCase = casesList.find((c) => c.case_id === selectedCaseId);

  // 3. Handle file selection & preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl('');
    }
  };

  const handleClearFile = () => {
    setFileName('');
    setPreviewUrl('');
  };

  // 4. Handle GPS capture
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser.');
      return;
    }

    setIsCapturingGps(true);
    setFormError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setIsCapturingGps(false);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setFormError('Could not fetch GPS coordinates. Please input manually if needed.');
        setIsCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 5. Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedCaseId) {
      setFormError('Please select an active verification case.');
      return;
    }

    if (!selectedCase?.parcel_id) {
      setFormError('Selected case is missing a valid parcel association.');
      return;
    }

    setIsSubmitting(true);
    try {
      const geoCoords =
        latitude && longitude
          ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
          : undefined;

      await evidence.createEvidence({
        parcel_id: selectedCase.parcel_id,
        case_id: selectedCaseId,
        evidence_type: evidenceType,
        file_url: previewUrl || (fileName ? `/static/uploads/${fileName}` : undefined),
        geo_coordinates: geoCoords,
        uploaded_by: 'FIELD_PATWARI',
        notes: notes.trim() || undefined,
      });

      setFormSuccess('Evidence record successfully uploaded and attached to case.');
      // Reset form fields
      setNotes('');
      setFileName('');
      setPreviewUrl('');
      setLatitude('');
      setLongitude('');

      // Refresh list
      fetchEvidence();
    } catch (err: any) {
      console.error('Evidence submission error:', err);
      setFormError(err?.error?.message || err?.message || 'Failed to submit evidence. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvidence = evidenceList.filter((item) => {
    if (filterType === 'ALL') return true;
    return item.evidence_type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Field Evidence Tracking</h1>
          <p className="text-gray-600 mt-1">
            Capture, geotag, and link field survey evidence, inspection photos, and witness statements.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Evidence Upload Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600" />
              Log Field Evidence
            </h2>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Case Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Verification Case <span className="text-red-500">*</span>
                </label>
                {isLoadingCases ? (
                  <div className="h-10 bg-gray-100 animate-pulse rounded-lg" />
                ) : casesList.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    No active verification cases available. Please create or open a case first.
                  </p>
                ) : (
                  <select
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    {casesList.map((c) => (
                      <option key={c.case_id} value={c.case_id}>
                        {c.case_id} — {c.title} ({c.parcel_id})
                      </option>
                    ))}
                  </select>
                )}
                {selectedCase && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <span className="bg-gray-100 px-2 py-0.5 rounded">Parcel: {selectedCase.parcel_id}</span>
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-sans">Priority: {selectedCase.priority}</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded font-sans">Status: {selectedCase.status}</span>
                  </div>
                )}
              </div>

              {/* 2. Evidence Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidence Type <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {EVIDENCE_TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = evidenceType === opt.value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => setEvidenceType(opt.value)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${opt.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900">{opt.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                        </div>
                        <input
                          type="radio"
                          name="evidence_type"
                          checked={isSelected}
                          onChange={() => setEvidenceType(opt.value)}
                          className="mt-1 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Photo / File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Photo or Attachment
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-400 transition-colors">
                  {previewUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={previewUrl}
                        alt="Evidence Preview"
                        className="max-h-40 rounded-lg object-contain shadow-sm mx-auto"
                      />
                      <button
                        type="button"
                        onClick={handleClearFile}
                        className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <p className="text-xs text-gray-500 mt-2 truncate max-w-xs mx-auto">{fileName}</p>
                    </div>
                  ) : fileName ? (
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-gray-700 truncate">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span className="truncate">{fileName}</span>
                      </div>
                      <button type="button" onClick={handleClearFile} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-1.5" />
                      <label className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        <span>Click to choose file</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Images (JPEG, PNG) or PDF up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Optional GPS Coordinates */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    GPS Coordinates (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={isCapturingGps}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                  >
                    {isCapturingGps ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Fetching GPS...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3 h-3" />
                        Detect Current GPS
                      </>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude (e.g. 23.2599)"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude (e.g. 77.4126)"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 5. Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field Observations & Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record boundary stone state, physical measurements, or witness statements..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !selectedCaseId}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording Evidence...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Log Evidence Record
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Previously Uploaded Evidence */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Evidence Repository
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Records associated with Case <span className="font-mono text-gray-700 font-semibold">{selectedCaseId || '—'}</span>
                </p>
              </div>

              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium">
                {['ALL', 'SITE_PHOTO', 'BOUNDARY_MEASUREMENT', 'WITNESS_RECORD'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      filterType === t
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t === 'ALL' ? 'All' : t === 'SITE_PHOTO' ? 'Photos' : t === 'BOUNDARY_MEASUREMENT' ? 'Surveys' : 'Witnesses'}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="mt-4">
              {isLoadingEvidence ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : filteredEvidence.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-gray-900">No Evidence Found</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                    {evidenceList.length === 0
                      ? 'No evidence records have been uploaded for this case yet. Use the form on the left to log your on-site observations.'
                      : 'No records match the selected type filter.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvidence.map((item) => (
                    <div
                      key={item.evidence_id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-indigo-200 transition-colors bg-white shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Image or Icon Preview */}
                          {item.file_url && item.file_url.startsWith('data:image') ? (
                            <img
                              src={item.file_url}
                              alt="Thumbnail"
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                              {item.evidence_type === 'SITE_PHOTO' ? (
                                <Camera className="w-6 h-6" />
                              ) : item.evidence_type === 'BOUNDARY_MEASUREMENT' ? (
                                <Ruler className="w-6 h-6" />
                              ) : (
                                <Users className="w-6 h-6" />
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {getTypeBadge(item.evidence_type)}
                              <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                {item.evidence_id}
                              </span>
                            </div>

                            {item.notes ? (
                              <p className="text-sm text-gray-800 font-medium mt-1.5 leading-snug">
                                {item.notes}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400 italic mt-1">No notes provided</p>
                            )}

                            {/* Metadata Footer */}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDate(item.timestamp)}
                              </span>
                              <span>By: <strong>{item.uploaded_by}</strong></span>
                              {item.geo_coordinates &&
                                item.geo_coordinates.latitude != null &&
                                item.geo_coordinates.longitude != null && (
                                  <a
                                    href={`https://www.google.com/maps?q=${item.geo_coordinates.latitude},${item.geo_coordinates.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                    {item.geo_coordinates.latitude.toFixed(4)}, {item.geo_coordinates.longitude.toFixed(4)}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidencePage;