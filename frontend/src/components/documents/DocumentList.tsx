import React, { useState, useEffect, useCallback } from 'react';
import { documents } from '../../api/documents';
import type { Document } from '../../types';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
} from 'lucide-react';

interface DocumentListProps {
  parcelId: string;
}

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'VERIFIED':
      return 'bg-green-100 text-green-800';
    case 'PENDING_VERIFICATION':
      return 'bg-yellow-100 text-yellow-800';
    case 'DISCREPANCY_DETECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'VERIFIED':
      return <CheckCircle className="w-4 h-4" />;
    case 'PENDING_VERIFICATION':
      return <Clock className="w-4 h-4" />;
    case 'DISCREPANCY_DETECTED':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
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

const formatExtractedData = (data: Record<string, any>): Array<{ key: string; value: string }> => {
  if (!data || Object.keys(data).length === 0) return [];

  const displayMap: Record<string, string> = {
    owner_name: 'Owner Name',
    area: 'Area (sq m)',
    survey_number: 'Survey Number',
    document_date: 'Document Date',
    registration_number: 'Registration Number',
    buyer_name: 'Buyer Name',
    seller_name: 'Seller Name',
    witness_name: 'Witness Name',
    property_type: 'Property Type',
    land_use: 'Land Use',
    latitude: 'Latitude',
    longitude: 'Longitude',
    khasra_number: 'Khasra Number',
    khata_number: 'Khata Number',
    mutation_date: 'Mutation Date',
    authority: 'Issuing Authority',
  };

  return Object.entries(data)
    .map(([key, value]) => ({
      key: displayMap[key.toLowerCase()] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }))
    .filter((item) => item.value && item.value !== 'null' && item.value !== 'undefined');
};

const DocumentCard: React.FC<{ document: Document }> = ({ document }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const extractedData = formatExtractedData(document.extracted_data);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">
                  {document.document_type.replace('_', ' ')}
                </h4>
                <p className="text-sm text-gray-500 truncate">{document.file_name}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Uploaded {formatDate(document.upload_date)}
              </span>
              <span className="flex items-center gap-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                    document.verification_status
                  )}`}
                >
                  {getStatusIcon(document.verification_status)}
                  {document.verification_status.replace('_', ' ')}
                </span>
              </span>
            </div>
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex-shrink-0"
            aria-expanded={isExpanded}
            aria-controls={`extraction-${document.document_id}`}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-5 h-5" />
                <span className="hidden sm:inline">Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-5 h-5" />
                <span className="hidden sm:inline">View AI Extraction</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Extraction Data - Expandable */}
      <div
        id={`extraction-${document.document_id}`}
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-gray-50 border-t border-gray-100 p-4 sm:p-6">
          {extractedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">
                Extraction pending or unavailable for this document.
              </p>
            </div>
          ) : (
            <div>
              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span className="p-1 bg-blue-100 text-blue-600 rounded">
                  <FileText className="w-4 h-4" />
                </span>
                AI Extracted Data
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {extractedData.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-3 border border-gray-100"
                  >
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      {item.key}
                    </dt>
                    <dd className="text-sm text-gray-900 break-words font-mono bg-gray-50 px-2 py-1 rounded">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DocumentList: React.FC<DocumentListProps> = ({ parcelId }) => {
  const [documentsData, setDocumentsData] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await documents.getDocuments(parcelId);
      setDocumentsData(data);
    } catch (err) {
      setError('Failed to load documents. Please try again.');
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [parcelId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Listen for document upload events to refresh the list
  useEffect(() => {
    const handleDocumentUploaded = () => {
      fetchDocuments();
    };
    window.addEventListener('documentUploaded', handleDocumentUploaded);
    return () => window.removeEventListener('documentUploaded', handleDocumentUploaded);
  }, [fetchDocuments]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
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
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (documentsData.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No documents uploaded</h3>
        <p className="text-gray-600">Upload your first document to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documentsData.map((doc) => (
        <DocumentCard key={doc.document_id} document={doc} />
      ))}
    </div>
  );
};

export default DocumentList;