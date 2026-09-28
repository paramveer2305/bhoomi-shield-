import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { parcels as parcelsApi } from '../../api/parcels';
import type { Parcel } from '../../types';
import {
  MapPin,
  Search,
  Filter,
  Layers,
  Shield,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  X,
  Maximize2,
  Info,
} from 'lucide-react';

export interface CadastralMapProps {
  parcels?: Parcel[];
  selectedParcelId?: string;
  onParcelSelect?: (parcel: Parcel) => void;
  height?: string;
  showFilters?: boolean;
  initialDistrict?: string;
  initialTehsil?: string;
  initialVillage?: string;
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
  VERIFIED: '#10b981',
  DEFAULT: '#64748b',
};

const getParcelColor = (parcel: Parcel): string => {
  if (parcel.risk_level && RISK_COLORS[parcel.risk_level]) {
    return RISK_COLORS[parcel.risk_level];
  }
  if (parcel.status === 'DISPUTED') return RISK_COLORS.CRITICAL;
  if (parcel.status === 'REQUIRES_VERIFICATION') return RISK_COLORS.MEDIUM;
  if (parcel.status === 'VERIFIED') return RISK_COLORS.LOW;
  return RISK_COLORS.DEFAULT;
};

const hasValidCoordinates = (p: Parcel): boolean => {
  return (
    typeof p.latitude === 'number' &&
    typeof p.longitude === 'number' &&
    !isNaN(p.latitude) &&
    !isNaN(p.longitude) &&
    p.latitude !== 0 &&
    p.longitude !== 0
  );
};

const CadastralMap: React.FC<CadastralMapProps> = ({
  parcels: externalParcels,
  selectedParcelId: initialSelectedId,
  onParcelSelect,
  height = '620px',
  showFilters = true,
  initialDistrict = '',
  initialTehsil = '',
  initialVillage = '',
}) => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [parcelsList, setParcelsList] = useState<Parcel[]>(externalParcels || []);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [isLoading, setIsLoading] = useState(!externalParcels);
  const [error, setError] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  // Filters state
  const [district, setDistrict] = useState(initialDistrict);
  const [tehsil, setTehsil] = useState(initialTehsil);
  const [village, setVillage] = useState(initialVillage);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch parcels if not provided externally
  const loadParcels = useCallback(async () => {
    if (externalParcels) {
      setParcelsList(externalParcels);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await parcelsApi.getParcels({
        district: district || undefined,
        tehsil: tehsil || undefined,
        village: village || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      setParcelsList(data);
    } catch (err: any) {
      console.error('Failed to load parcels for GIS map:', err);
      setError(err?.message || 'Failed to load cadastral parcels from server.');
    } finally {
      setIsLoading(false);
    }
  }, [externalParcels, district, tehsil, village, statusFilter]);

  useEffect(() => {
    loadParcels();
  }, [loadParcels]);

  // Client-side text query filtering (survey number, parcel_id, owner)
  const filteredParcels = parcelsList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.parcel_id?.toLowerCase().includes(q) ||
      p.survey_number?.toLowerCase().includes(q) ||
      p.owner_name?.toLowerCase().includes(q) ||
      p.village?.toLowerCase().includes(q)
    );
  });

  const validParcels = filteredParcels.filter(hasValidCoordinates);
  const missingCoordinatesCount = filteredParcels.length - validParcels.length;

  // 2. Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: Madhya Pradesh, India
    const defaultCenter: L.LatLngExpression = [23.2599, 77.4126];
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 7,
      zoomControl: false,
    });

    // Zoom control at top-left
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Free, reliable Base Tile Layers
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    });

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
        maxZoom: 18,
      }
    );

    const lightCadastralLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }
    );

    // Add default street layer
    streetLayer.addTo(map);

    // Add layer switcher control at top-right
    L.control
      .layers(
        {
          'Street Map': streetLayer,
          'Satellite View': satelliteLayer,
          'Cadastral Light': lightCadastralLayer,
        },
        {},
        { position: 'topright' }
      )
      .addTo(map);

    // Markers layer group
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Render markers whenever parcels or selection change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (validParcels.length === 0) return;

    const bounds = L.latLngBounds([]);

    validParcels.forEach((parcel) => {
      const lat = parcel.latitude!;
      const lng = parcel.longitude!;
      bounds.extend([lat, lng]);

      const isSelected = selectedParcel?.parcel_id === parcel.parcel_id;
      const color = getParcelColor(parcel);

      // SVG DivIcon with risk color
      const customIcon = L.divIcon({
        className: 'cadastral-marker-container',
        html: `
          <div style="
            background: ${color};
            width: ${isSelected ? '36px' : '30px'};
            height: ${isSelected ? '36px' : '30px'};
            border-radius: 50%;
            border: ${isSelected ? '3px solid #1e1b4b' : '2px solid #ffffff'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease;
          ">
            <svg width="${isSelected ? '18' : '15'}" height="${isSelected ? '18' : '15'}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        `,
        iconSize: isSelected ? [36, 36] : [30, 30],
        iconAnchor: isSelected ? [18, 18] : [15, 15],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedParcel(parcel);
        if (onParcelSelect) onParcelSelect(parcel);
      });

      // Quick tooltip on hover
      marker.bindTooltip(
        `<strong>${parcel.survey_number}</strong> (${parcel.parcel_id})<br/><span style="color:${color}; font-weight:600;">${parcel.risk_level || parcel.status}</span><br/><span style="font-size:10px; color:#666;">GPS Point</span>`,
        { direction: 'top', offset: [0, -16] }
      );

      markersGroup.addLayer(marker);
    });

    // Auto-fit bounds if parcels are present
    if (validParcels.length === 1) {
      map.setView([validParcels[0].latitude!, validParcels[0].longitude!], 15);
    } else if (validParcels.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [validParcels, selectedParcel, onParcelSelect]);

  // Sync initial selection
  useEffect(() => {
    if (initialSelectedId && validParcels.length > 0) {
      const match = validParcels.find((p) => p.parcel_id === initialSelectedId);
      if (match) setSelectedParcel(match);
    }
  }, [initialSelectedId, validParcels]);

  const fitAllParcels = () => {
    const map = mapInstanceRef.current;
    if (!map || validParcels.length === 0) return;
    const bounds = L.latLngBounds(validParcels.map((p) => [p.latitude!, p.longitude!]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  };

  const handleResetFilters = () => {
    setDistrict('');
    setTehsil('');
    setVillage('');
    setStatusFilter('');
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Search and Filters Toolbar */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search survey #, parcel ID, or owner name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">All Districts</option>
                <option value="Bhopal">Bhopal</option>
                <option value="Indore">Indore</option>
                <option value="Jabalpur">Jabalpur</option>
                <option value="Gwalior">Gwalior</option>
              </select>

              <select
                value={tehsil}
                onChange={(e) => setTehsil(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">All Tehsils</option>
                <option value="Huzur">Huzur</option>
                <option value="Indore">Indore</option>
                <option value="Jabalpur">Jabalpur</option>
              </select>

              <input
                type="text"
                placeholder="Village..."
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">All Statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="REQUIRES_VERIFICATION">Requires Verification</option>
                <option value="DISPUTED">Disputed</option>
                <option value="IN_REVIEW">In Review</option>
              </select>

              {(district || tehsil || village || statusFilter || searchQuery) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              )}

              <button
                type="button"
                onClick={loadParcels}
                disabled={isLoading}
                className="p-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Reload from API"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={fitAllParcels}
                disabled={validParcels.length === 0}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Fit to All Parcels"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fit All</span>
              </button>
            </div>
          </div>

          {missingCoordinatesCount > 0 && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1 inline-flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {missingCoordinatesCount} parcel(s) lack GPS coordinates and are omitted from map view.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadParcels} className="underline font-semibold ml-4">
            Retry
          </button>
        </div>
      )}

      {/* Map Viewport Container */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-slate-100"
        style={{ height }}
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-xs flex items-center justify-center">
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex items-center gap-3">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-gray-800">Loading Cadastral Layer...</span>
            </div>
          </div>
        )}

        {/* Empty State Overlay */}
        {!isLoading && validParcels.length === 0 && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-white/95 px-6 py-4 rounded-xl shadow-lg border border-gray-200 text-center max-w-sm">
            <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="font-semibold text-gray-800 text-sm">No mapped parcels found</p>
            <p className="text-xs text-gray-500 mt-1">
              No parcels matching current filter criteria have valid coordinates registered.
            </p>
          </div>
        )}

        {/* Floating Risk Legend */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-md border border-gray-200 text-xs">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="font-semibold text-gray-900 text-xs flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Cadastral Risk Legend
            </span>
            <button
              type="button"
              onClick={() => setShowLegend(!showLegend)}
              className="text-gray-400 hover:text-gray-600 text-[10px]"
            >
              {showLegend ? 'Hide' : 'Show'}
            </button>
          </div>
          {showLegend && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600 inline-block border border-white" />
                <span className="text-gray-700">Critical Risk / Disputed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-600 inline-block border border-white" />
                <span className="text-gray-700">High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block border border-white" />
                <span className="text-gray-700">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-white" />
                <span className="text-gray-700">Low Risk / Verified</span>
              </div>
            </div>
          )}
        </div>

        {/* Selected Parcel Side Panel / Popover */}
        {selectedParcel && (
          <div className="absolute top-4 right-4 z-20 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 p-5 animate-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedParcel.parcel_id}
                </span>
                <h3 className="font-bold text-gray-900 text-lg mt-1">
                  Survey #{selectedParcel.survey_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedParcel(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-semibold px-2 py-0.5 rounded text-[11px] bg-gray-100 text-gray-800">
                  {selectedParcel.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Risk Level</span>
                <span
                  className="font-bold px-2 py-0.5 rounded text-[11px]"
                  style={{
                    backgroundColor: `${getParcelColor(selectedParcel)}20`,
                    color: getParcelColor(selectedParcel),
                  }}
                >
                  {selectedParcel.risk_level || 'LOW'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Owner</span>
                <span className="font-medium text-gray-900">{selectedParcel.owner_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Area</span>
                <span className="font-medium text-gray-900">
                  {selectedParcel.area?.toLocaleString()} sq m ({selectedParcel.land_type})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location</span>
                <span className="font-medium text-gray-900 text-right">
                  {selectedParcel.village}, {selectedParcel.tehsil}
                </span>
              </div>
              {selectedParcel.latitude && selectedParcel.longitude && (
                <div className="flex justify-between">
                  <span className="text-gray-500">GPS Coordinates</span>
                  <span className="font-mono text-gray-700">
                    {selectedParcel.latitude.toFixed(5)}, {selectedParcel.longitude.toFixed(5)}
                  </span>
                </div>
              )}
              <div className="text-[11px] text-gray-400 italic pt-1 border-t border-gray-50">
                * Point location marker (Cadastral boundary geometry not recorded in database)
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate(`/parcels/${selectedParcel.parcel_id}`)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>View Full Parcel Record</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/parcels/${selectedParcel.parcel_id}?tab=risk`)}
                className="w-full py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                View Risk Intelligence Breakdown
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CadastralMap;
