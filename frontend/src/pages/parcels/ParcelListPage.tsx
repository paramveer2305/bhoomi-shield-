import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { parcels } from '../../api/parcels';
import type { Parcel } from '../../types';
import CadastralMap from '../../components/parcels/CadastralMap';
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
  List,
  Map as MapIcon,
  ExternalLink,
} from 'lucide-react';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REQUIRES_VERIFICATION', label: 'Requires Verification' },
  { value: 'DISPUTED', label: 'Disputed' },
  { value: 'IN_REVIEW', label: 'In Review' },
];

const getStatusBadgeClass = (status: Parcel['status']): string => {
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

const formatArea = (area?: number): string => {
  return `${area?.toLocaleString() ?? 0} sq m`;
};

const ParcelListPage: React.FC = () => {
  const navigate = useNavigate();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const activeView = urlSearchParams.get('view') === 'map' ? 'map' : 'table';

  const [parcelsData, setParcelsData] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useState({
    district: '',
    tehsil: '',
    village: '',
    status: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchParcels = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const params = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
      district: searchParams.district || undefined,
      tehsil: searchParams.tehsil || undefined,
      village: searchParams.village || undefined,
      status: searchParams.status || undefined,
    };

    try {
      const data = await parcels.getParcels(params);
      setParcelsData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load parcels. Please try again.');
      console.error('Error fetching parcels:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchParams]);

  useEffect(() => {
    if (activeView === 'table') {
      fetchParcels();
    }
  }, [fetchParcels, activeView]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchParcels();
  };

  const handleFilterChange = (key: string, value: string) => {
    setSearchParams((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleRowClick = (parcelId: string) => {
    navigate(`/parcels/${parcelId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Land Parcels</h1>
          <p className="text-gray-600 mt-1">Manage, monitor, and map registered land parcels</p>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-xl border border-gray-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setUrlSearchParams({})}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'table'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Table View</span>
          </button>
          <button
            type="button"
            onClick={() => setUrlSearchParams({ view: 'map' })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'map'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>Cadastral GIS Map</span>
          </button>
        </div>
      </div>

      {/* Cadastral Map View */}
      {activeView === 'map' ? (
        <CadastralMap height="640px" showFilters={true} />
      ) : (
        <>
          {/* Filters Form for Table */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                    District
                  </label>
                  <input
                    id="district"
                    type="text"
                    value={searchParams.district}
                    onChange={(e) => handleFilterChange('district', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Filter by district"
                  />
                </div>
                <div>
                  <label htmlFor="tehsil" className="block text-sm font-medium text-gray-700 mb-1">
                    Tehsil
                  </label>
                  <input
                    id="tehsil"
                    type="text"
                    value={searchParams.tehsil}
                    onChange={(e) => handleFilterChange('tehsil', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Filter by tehsil"
                  />
                </div>
                <div>
                  <label htmlFor="village" className="block text-sm font-medium text-gray-700 mb-1">
                    Village
                  </label>
                  <input
                    id="village"
                    type="text"
                    value={searchParams.village}
                    onChange={(e) => handleFilterChange('village', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Filter by village"
                  />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    value={searchParams.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={fetchParcels}
                className="text-xs font-semibold underline hover:no-underline ml-4 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parcel ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Survey Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : parcelsData.length === 0 ? (
              <div className="p-12 text-center">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No parcels found</h2>
                <p className="text-gray-600">Try adjusting your filters or check back later.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parcel ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Survey Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parcelsData.map((parcel) => (
                        <tr
                          key={parcel.parcel_id}
                          onClick={() => handleRowClick(parcel.parcel_id)}
                          className="cursor-pointer hover:bg-gray-50 transition-colors group"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="text-xs text-gray-900 font-mono font-semibold bg-gray-100 px-2 py-0.5 rounded">
                              {parcel.parcel_id}
                            </code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">{parcel.survey_number}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 font-medium">{parcel.village}</div>
                            <div className="text-xs text-gray-500">{parcel.district}, {parcel.tehsil}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{parcel.owner_name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{formatArea(parcel.area)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(parcel.status)}`}>
                              {parcel.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/parcels/${parcel.parcel_id}?tab=overview`);
                              }}
                              className="px-2.5 py-1 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="View on Map"
                            >
                              <span>Map</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
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
                      disabled={parcelsData.length < pageSize}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ParcelListPage;