import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui';
import { Badge, getStatusBadgeVariant, getRiskBadgeVariant } from '../../components/ui';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { Search, MapPin, FileText, AlertTriangle, Shield, Map, ChevronRight, Download, Eye, RefreshCw } from 'lucide-react';

const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'recent'>('search');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Mock results
    setSearchResults([
      {
        parcel_id: 'MP-BPL-1024',
        survey_number: '124/2',
        district: 'Bhopal',
        tehsil: 'Huzur',
        village: 'Barkheda',
        owner_name: 'Ramesh Sharma',
        area: 2400,
        land_type: 'Agricultural',
        status: 'VERIFIED',
        risk_level: 'LOW',
        latitude: 23.2599,
        longitude: 77.4126,
      },
      {
        parcel_id: 'MP-IND-2048',
        survey_number: '567/1A',
        district: 'Indore',
        tehsil: 'Indore',
        village: 'Rau',
        owner_name: 'Priya Patel',
        area: 1800,
        land_type: 'Residential',
        status: 'REQUIRES_VERIFICATION',
        risk_level: 'MEDIUM',
        latitude: 22.7196,
        longitude: 75.8577,
      },
    ]);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Public Title Search</h1>
        <p className="text-secondary-600 mt-1">Search land records by survey number, owner name, or location</p>
      </div>

      {/* Search Card */}
      <Card variant="elevated" padding="lg">
        <div className="space-y-6">
          <div>
            <label className="label">Search by Survey Number</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="text"
                  placeholder="e.g., 124/2, 567/1A, MP-BPL-1024"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="input pl-10 pr-4 text-lg"
                />
              </div>
              <Button variant="primary" size="lg" onClick={handleSearch} loading={loading} className="gap-2">
                <Search className="w-5 h-5" />
                Search
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">District</label>
              <select className="select">
                <option value="">All Districts</option>
                <option value="Bhopal">Bhopal</option>
                <option value="Indore">Indore</option>
                <option value="Jabalpur">Jabalpur</option>
                <option value="Gwalior">Gwalior</option>
              </select>
            </div>
            <div>
              <label className="label">Tehsil</label>
              <select className="select">
                <option value="">All Tehsils</option>
                <option value="Huzur">Huzur</option>
                <option value="Indore">Indore</option>
                <option value="Jabalpur">Jabalpur</option>
              </select>
            </div>
            <div>
              <label className="label">Land Type</label>
              <select className="select">
                <option value="">All Types</option>
                <option value="Agricultural">Agricultural</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <Button variant="outline" className="gap-2" onClick={() => setSearchQuery('')}>
              <RefreshCw className="w-4 h-4" />
              Clear
            </Button>
            <Button variant="outline" className="gap-2">
              <MapPin className="w-4 h-4" />
              Advanced Search
            </Button>
            <span className="text-sm text-secondary-500 ml-auto">
              Search is public. No login required for basic lookup.
            </span>
          </div>
        </div>
      </Card>

      {/* Results */}
      {searchQuery && (
        <Card variant="default" padding="none">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Search Results</h2>
              <span className="badge-secondary text-sm">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </span>
            </div>
          </div>
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-secondary-600">Searching records...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-12 text-center">
              <MapPin className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No records found</h3>
              <p className="text-secondary-500">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {searchResults.map((parcel) => (
                <div key={parcel.parcel_id} className="p-6 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold">{parcel.survey_number}</h3>
                        <Badge variant={getStatusBadgeVariant(parcel.status)} size="sm">
                          {parcel.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant={getRiskBadgeVariant(parcel.risk_level)} size="sm" dot>
                          {parcel.risk_level} Risk
                        </Badge>
                      </div>
                      <p className="text-secondary-500 text-sm mt-1">
                        {parcel.village}, {parcel.tehsil}, {parcel.district} • {parcel.area.toLocaleString()} sq m
                      </p>
                      <p className="text-secondary-500 text-sm">
                        Owner: {parcel.owner_name} • {parcel.land_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedParcel(parcel)} aria-label="View details">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="View on map">
                        <Map className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 hidden sm:inline-flex">
                        <Download className="w-3.5 h-3.5" />
                        Report
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Recent Searches / Popular */}
      <Card variant="outlined" padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Popular Searches</h3>
          <Button variant="ghost" size="sm">View All</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Bhopal - Agricultural', query: 'Bhopal Agricultural' },
            { label: 'Indore - Residential', query: 'Indore Residential' },
            { label: 'Jabalpur - Commercial', query: 'Jabalpur Commercial' },
            { label: 'Gwalior - Industrial', query: 'Gwalior Industrial' },
          ].map((item) => (
            <Button
              key={item.query}
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => { setSearchQuery(item.query); handleSearch(); }}
            >
              <MapPin className="w-4 h-4" />
              <span className="text-left">{item.label}</span>
            </Button>
          ))}
        </div>
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
                    <Badge variant={getRiskBadgeVariant(selectedParcel.risk_level)} size="md" dot>
                      {selectedParcel.risk_level} Risk
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
                    <p className="text-secondary-500 text-sm font-medium">Parcel ID</p>
                    <p className="font-medium text-sm font-mono">{selectedParcel.parcel_id}</p>
                  </div>
                  <div>
                    <p className="text-secondary-500 text-sm font-medium">Coordinates</p>
                    <p className="font-medium text-sm font-mono">
                      {selectedParcel.latitude?.toFixed(6)}, {selectedParcel.longitude?.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedParcel(null)}>Close</Button>
                <Button variant="primary" onClick={() => setSelectedParcel(null)}>
                  <ChevronRight className="w-4 h-4" />
                  View Full Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;