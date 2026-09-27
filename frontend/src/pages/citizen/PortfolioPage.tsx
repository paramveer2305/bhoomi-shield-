import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui';
import { Badge, getStatusBadgeVariant, getRiskBadgeVariant } from '../../components/ui';
import { Button } from '../../components/ui';
import { DataGrid } from '../../components/ui';
import type { Column } from '../../components/ui';
import { Search, Filter, MapPin, FileText, AlertTriangle, Shield, ChevronRight, Eye, Download, Map } from 'lucide-react';
import { parcels } from '../../api/parcels';
import type { Parcel } from '../../types';

const PortfolioPage: React.FC = () => {
  const [parcelsData, setParcelsData] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);

  useEffect(() => {
    const fetchParcels = async () => {
      try {
        // In real app, filter by current user's ownership
        const data = await parcels.getParcels({ status: 'VERIFIED' });
        setParcelsData(data);
      } catch (error) {
        console.error('Failed to fetch parcels:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchParcels();
  }, []);

  const filteredParcels = parcelsData.filter(parcel =>
    parcel.survey_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parcel.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parcel.village.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: Column<Parcel>[] = [
    { key: 'survey_number', header: 'Survey Number', sortable: true, filterable: true, width: '140px' },
    { key: 'district', header: 'District', sortable: true, filterable: true, width: '120px' },
    { key: 'tehsil', header: 'Tehsil', sortable: true, filterable: true, width: '120px' },
    { key: 'village', header: 'Village', sortable: true, filterable: true, width: '120px' },
    { key: 'area', header: 'Area (sq m)', sortable: true, align: 'right', width: '110px' },
    { key: 'land_type', header: 'Land Type', sortable: true, filterable: true, width: '130px' },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      accessor: (row) => (
        <Badge variant={getStatusBadgeVariant(row.status)} size="sm">
          {row.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'risk_level',
      header: 'Risk Level',
      width: '120px',
      accessor: (row) => (
        <Badge variant={getRiskBadgeVariant(row.risk_level || 'LOW')} size="sm" dot>
          {row.risk_level}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '120px',
      accessor: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSelectedParcel(row)} aria-label="View details">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Download document">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="View on map">
            <Map className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Land Portfolio</h1>
          <p className="text-secondary-600 mt-1">View and manage your land holdings</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Portfolio
          </Button>
          <Button variant="primary" className="gap-2">
            <FileText className="w-4 h-4" />
            Add New Parcel
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="hover" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-500 text-sm font-medium">Total Parcels</p>
              <p className="text-3xl font-bold text-foreground mt-1">{parcelsData.length}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>
        <Card variant="hover" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-500 text-sm font-medium">Verified</p>
              <p className="text-3xl font-bold text-success-600 mt-1">
                {parcelsData.filter(p => p.status === 'VERIFIED').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </Card>
        <Card variant="hover" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-500 text-sm font-medium">Pending Review</p>
              <p className="text-3xl font-bold text-warning-600 mt-1">
                {parcelsData.filter(p => p.status === 'REQUIRES_VERIFICATION').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </Card>
        <Card variant="hover" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-500 text-sm font-medium">Total Area</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {parcelsData.reduce((sum, p) => sum + p.area, 0).toLocaleString()} sq m
              </p>
            </div>
            <div className="w-12 h-12 bg-info-100 rounded-xl flex items-center justify-center">
              <Map className="w-6 h-6 text-info-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card variant="outlined" padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              type="text"
              placeholder="Search by survey number, district, village..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 pr-4"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button variant="outline" className="gap-2">
              <MapPin className="w-4 h-4" />
              Map View
            </Button>
          </div>
        </div>
      </Card>

      {/* Parcels Data Grid */}
      <Card variant="default" padding="none">
        <DataGrid
          columns={columns}
          data={filteredParcels}
          keyAccessor={(row) => row.parcel_id}
          loading={loading}
          pagination
          pageSize={10}
          showPageSizeSelector
          hoverable
          striped
          onRowClick={(row) => setSelectedParcel(row)}
          emptyMessage="No parcels found in your portfolio"
        />
      </Card>

      {/* Parcel Detail Modal */}
      {selectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm animate-in">
          <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden animate-in">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold">{selectedParcel.survey_number}</h2>
                <p className="text-secondary-500 text-sm">{selectedParcel.village}, {selectedParcel.tehsil}, {selectedParcel.district}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedParcel(null)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-secondary-500 text-sm font-medium">Status</p>
                    <Badge variant={getStatusBadgeVariant(selectedParcel.status)} size="md">
                      {selectedParcel.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-secondary-500 text-sm font-medium">Risk Level</p>
                    <Badge variant={getRiskBadgeVariant(selectedParcel.risk_level || 'LOW')} size="md" dot>
                      {selectedParcel.risk_level}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-secondary-500 text-sm font-medium">Land Type</p>
                    <p className="font-medium">{selectedParcel.land_type}</p>
                  </div>
                  <div>
                    <p className="text-secondary-500 text-sm font-medium">Area</p>
                    <p className="font-medium">{selectedParcel.area.toLocaleString()} sq m</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-secondary-500 text-sm font-medium">Owner</p>
                    <p className="font-medium">{selectedParcel.owner_name}</p>
                  </div>
                  <div>
                    <p className="text-secondary-500 text-sm font-medium">Coordinates</p>
                    <p className="font-medium text-sm font-mono">
                      {selectedParcel.latitude?.toFixed(6)}, {selectedParcel.longitude?.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-secondary-500 text-sm font-medium">Last Updated</p>
                    <p className="font-medium">{new Date(selectedParcel.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedParcel(null)}>Close</Button>
                <Button variant="primary" onClick={() => setSelectedParcel(null)}>
                  <ChevronRight className="w-4 h-4" />
                  View Full Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;