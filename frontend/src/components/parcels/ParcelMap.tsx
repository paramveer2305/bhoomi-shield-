import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Shield } from 'lucide-react';
import type { Parcel } from '../../types';
import CadastralMap from './CadastralMap';

// Fix Leaflet default icon paths in Vite bundles
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

export interface ParcelMapProps {
  latitude?: number;
  longitude?: number;
  parcelId?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  parcels?: Parcel[];
  height?: string;
}

const RISK_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ea580c',
  CRITICAL: '#dc2626',
  DEFAULT: '#64748b',
};

const ParcelMap: React.FC<ParcelMapProps> = ({
  latitude,
  longitude,
  parcelId = '',
  riskLevel = 'LOW',
  parcels,
  height = '380px',
}) => {
  // If multiple parcels are passed, delegate to the rich CadastralMap component
  if (parcels && parcels.length > 0) {
    return <CadastralMap parcels={parcels} height={height} showFilters={true} />;
  }

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const hasCoords =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude !== 0 &&
    longitude !== 0;

  useEffect(() => {
    if (!mapContainerRef.current || !hasCoords) return;

    const lat = latitude!;
    const lng = longitude!;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
    });
    mapRef.current = map;

    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Free OpenStreetMap base layer
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });

    // Free ESRI satellite imagery
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
        maxZoom: 18,
      }
    );

    streetLayer.addTo(map);

    // Layer switcher control
    L.control
      .layers(
        {
          'Street Map': streetLayer,
          'Satellite View': satelliteLayer,
        },
        {},
        { position: 'topright' }
      )
      .addTo(map);

    const color = RISK_COLORS[riskLevel] || RISK_COLORS.DEFAULT;

    // Custom marker icon with risk color
    const customIcon = L.divIcon({
      className: 'parcel-map-marker',
      html: `
        <div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

    marker.bindPopup(`
      <div style="font-family: system-ui; padding: 4px; min-width: 150px;">
        <strong style="font-size: 13px;">${parcelId}</strong><br/>
        <span style="color: ${color}; font-weight: 600; text-transform: uppercase; font-size: 11px;">
          ${riskLevel} Risk
        </span><br/>
        <span style="font-family: monospace; font-size: 11px; color: #666;">
          Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}
        </span><br/>
        <span style="font-size: 10px; color: #888; font-style: italic;">
          GPS Point (Cadastral boundaries not recorded)
        </span>
      </div>
    `);

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [hasCoords, latitude, longitude, parcelId, riskLevel]);

  if (!hasCoords) {
    return (
      <div
        className="bg-gray-100 flex flex-col items-center justify-center text-gray-400 rounded-xl border border-gray-200"
        style={{ height }}
      >
        <MapPin className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-700">Cadastral Map</p>
        <p className="text-xs text-gray-500 mt-1">
          No GPS coordinates currently registered for parcel {parcelId || ''}
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden shadow-sm border border-gray-200"
      style={{ height }}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md text-xs font-medium flex items-center gap-2 border border-gray-100">
        <Shield className="w-3.5 h-3.5" style={{ color: RISK_COLORS[riskLevel] }} />
        <span className="text-gray-600">Risk Assessment: </span>
        <span
          className="font-bold"
          style={{ color: RISK_COLORS[riskLevel] || RISK_COLORS.DEFAULT }}
        >
          {riskLevel}
        </span>
      </div>
    </div>
  );
};

export default ParcelMap;
