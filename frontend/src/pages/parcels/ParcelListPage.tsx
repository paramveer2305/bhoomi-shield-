import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { parcels } from '../../api/parcels';
import type { Parcel } from '../../types';
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
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

const formatArea = (area: number): string => {
  return `${area.toLocaleString()} sq m`;
};

const ParcelListPage: React.FC = () => {
  const navigate = useNavigate();
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
    } catch (err) {
      setError('Failed to load parcels. Please try again.');
      console.error('Error fetching parcels:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchParams]);

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Land Parcels</h1>
            <p className="text-gray-600 mt-1">Manage and monitor registered land parcels</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/3"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/4"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Land Parcels</h1>
            <p className="text-gray-600 mt-1">Manage and monitor registered land parcels</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchParcels}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Land Parcels</h1>
          <p className="text-gray-600 mt-1">Manage and monitor registered land parcels</p>
        </div>
      </div>

      {/* Filters */}
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
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {parcelsData.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parcelsData.map((parcel) => (
                    <tr
                      key={parcel.parcel_id}
                      onClick={() => handleRowClick(parcel.parcel_id)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm text-gray-900 font-mono">{parcel.parcel_id}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{parcel.survey_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{parcel.village}</div>
                        <div className="text-sm text-gray-500">{parcel.district} / {parcel.tehsil}</div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {currentPage}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ParcelListPage;