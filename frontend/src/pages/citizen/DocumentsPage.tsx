import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui';
import { Badge, getStatusBadgeVariant } from '../../components/ui';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { Search, FileText, Upload, Download, Eye, Trash2, AlertTriangle, Shield, Plus, Filter, MoreVertical } from 'lucide-react';

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState([
    { id: '1', name: 'Sale Deed - Barkheda', type: 'SALE_DEED', parcel: '124/2', status: 'VERIFIED', uploadDate: '2024-01-15', size: '2.4 MB' },
    { id: '2', name: 'Mutation Record - Rau', type: 'MUTATION_RECORD', parcel: '567/1A', status: 'PENDING_VERIFICATION', uploadDate: '2024-02-20', size: '1.8 MB' },
    { id: '3', name: 'Khasra Copy - Barkheda', type: 'KHASRA_COPY', parcel: '124/2', status: 'VERIFIED', uploadDate: '2024-01-10', size: '3.1 MB' },
    { id: '4', name: 'Power of Attorney', type: 'POWER_OF_ATTORNEY', parcel: '567/1A', status: 'DISCREPANCY_DETECTED', uploadDate: '2024-03-01', size: '1.2 MB' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!filterType || doc.type === filterType)
  );

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Document Vault</h1>
          <p className="text-secondary-600 mt-1">Manage your uploaded land documents</p>
        </div>
        <Button variant="primary" className="gap-2" onClick={() => setShowUpload(true)}>
          <Plus className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="hover" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-500 text-sm font-medium">Total Documents</p>
              <p className="text-2xl font-bold text-foreground mt-1">{documents.length}</p>
            </div>
            <FileText className="w-8 h-8 text-primary-500" />
          </div>
        </Card>
        <Card variant="hover" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-500 text-sm font-medium">Verified</p>
              <p className="text-2xl font-bold text-success-600 mt-1">
                {documents.filter(d => d.status === 'VERIFIED').length}
              </p>
            </div>
            <Shield className="w-8 h-8 text-success-500" />
          </div>
        </Card>
        <Card variant="hover" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-500 text-sm font-medium">Pending</p>
              <p className="text-2xl font-bold text-warning-600 mt-1">
                {documents.filter(d => d.status === 'PENDING_VERIFICATION').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-warning-500" />
          </div>
        </Card>
        <Card variant="hover" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-500 text-sm font-medium">Issues</p>
              <p className="text-2xl font-bold text-destructive-600 mt-1">
                {documents.filter(d => d.status === 'DISCREPANCY_DETECTED').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-destructive-500" />
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card variant="outlined" padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 pr-4"
            />
          </div>
          <div className="flex gap-2">
            <select className="select w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="SALE_DEED">Sale Deed</option>
              <option value="MUTATION_RECORD">Mutation Record</option>
              <option value="KHASRA_COPY">Khasra Copy</option>
              <option value="POWER_OF_ATTORNEY">Power of Attorney</option>
            </select>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              More Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Documents Grid */}
      <Card variant="default" padding="none">
        <div className="divide-y divide-border">
          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
              <p className="text-secondary-500 mb-4">Upload your first document to get started</p>
              <Button variant="primary" className="gap-2" onClick={() => setShowUpload(true)}>
                <Upload className="w-4 h-4" />
                Upload Document
              </Button>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div key={doc.id} className="p-6 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-14 h-14 bg-secondary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-7 h-7 text-secondary-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{doc.name}</h3>
                      <Badge variant="secondary" size="sm">{doc.type.replace('_', ' ')}</Badge>
                      <Badge variant={getStatusBadgeVariant(doc.status)} size="sm">
                        {doc.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-secondary-500 text-sm mt-1 truncate">
                      Parcel: {doc.parcel} • {doc.size} • Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" aria-label="View document">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Download document">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="More options">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm animate-in">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Upload Document</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowUpload(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Document Type</label>
                <select className="select">
                  <option value="SALE_DEED">Sale Deed</option>
                  <option value="MUTATION_RECORD">Mutation Record</option>
                  <option value="KHASRA_COPY">Khasra Copy</option>
                  <option value="POWER_OF_ATTORNEY">Power of Attorney</option>
                </select>
              </div>
              <div>
                <label className="label">Parcel Survey Number</label>
                <input type="text" placeholder="e.g., 124/2" className="input" />
              </div>
              <div>
                <label className="label">File</label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary-500 transition-colors">
                  <Upload className="w-10 h-10 text-secondary-400 mx-auto mb-2" />
                  <p className="text-secondary-500">Drag & drop or click to browse</p>
                  <p className="text-xs text-secondary-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
                <Button variant="primary" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;