import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ParcelMapProps {
  latitude?: number;
  longitude?: number;
  parcelId: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const ParcelMap: React.FC<ParcelMapProps> = ({ latitude, longitude, parcelId, riskLevel = 'LOW' }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !latitude || !longitude) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([latitude, longitude], 15);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    // Risk-based marker color
    const riskColors = {
      LOW: '#10b981',
      MEDIUM: '#f59e0b',
      HIGH: '#ef4444',
      CRITICAL: '#dc2626',
    };

    const color = riskColors[riskLevel];

    // Add custom marker
    const marker = L.marker([latitude, longitude], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background: ${color};
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    }).addTo(mapRef.current);

    marker.bindPopup(`
      <div style="font-family: system-ui; padding: 4px;">
        <strong>${parcelId}</strong><br/>
        <span style="color: ${color}; font-weight: 600; text-transform: uppercase;">${riskLevel} Risk</span><br/>
        <small>${latitude.toFixed(6)}, ${longitude.toFixed(6)}</small>
      </div>
    `);

    // Draw approximate parcel boundary (simulated polygon)
    const bounds = [
      [latitude + 0.001, longitude - 0.001],
      [latitude + 0.001, longitude + 0.001],
      [latitude - 0.001, longitude + 0.001],
      [latitude - 0.001, longitude - 0.001],
    ] as L.LatLngExpression[];

    L.polygon(bounds, {
      color: color,
      fillColor: color,
      fillOpacity: 0.2,
      weight: 2,
    })
      .addTo(mapRef.current)
      .bindTooltip('Parcel Boundary (Approximate)', { permanent: false, direction: 'top' });

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, parcelId, riskLevel]);

  if (!latitude || !longitude) {
    return (
      <div className="h-96 bg-gray-100 flex flex-col items-center justify-center text-gray-400 rounded-lg border border-gray-200">
        <MapPin className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm font-medium">Map View</p>
        <p className="text-xs text-gray-500 mt-1">No coordinates available for this parcel</p>
      </div>
    );
  }

  return (
    <div className="relative h-96 rounded-lg overflow-hidden shadow-sm border border-gray-200">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-3 right-3 bg-white px-3 py-2 rounded-lg shadow-md text-xs font-medium">
        <span className="text-gray-600">Risk Level: </span>
        <span
          className="font-bold"
          style={{
            color: riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? '#dc2626' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981',
          }}
        >
          {riskLevel}
        </span>
      </div>
    </div>
  );
};

export default ParcelMap;
