import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import type { EventRead } from '../../types/index.ts';

const DEFAULT_CENTER: [number, number] = [38.7223, -9.1393];

function fixLeafletDefaultIcons() {
  const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
  delete proto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}

function MapFitBounds({
  events,
  userPosition,
}: {
  events: EventRead[];
  userPosition: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([]);
    let has = false;
    if (userPosition) {
      bounds.extend([userPosition.lat, userPosition.lng]);
      has = true;
    }
    events.forEach((e) => {
      bounds.extend([e.lat, e.long]);
      has = true;
    });
    if (has) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    }
  }, [map, events, userPosition]);

  return null;
}

export interface EventMapProps {
  events: EventRead[];
  userPosition: { lat: number; lng: number } | null;
  height?: number;
  className?: string;
}

export default function EventMap({
  events,
  userPosition,
  height = 280,
  className = '',
}: EventMapProps) {
  useEffect(() => {
    fixLeafletDefaultIcons();
  }, []);

  const center: [number, number] = userPosition
    ? [userPosition.lat, userPosition.lng]
    : events[0]
      ? [events[0].lat, events[0].long]
      : DEFAULT_CENTER;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200 shadow-sm ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFitBounds events={events} userPosition={userPosition} />
        {userPosition && (
          <CircleMarker
            center={[userPosition.lat, userPosition.lng]}
            radius={10}
            pathOptions={{
              color: '#0d6efd',
              fillColor: '#0d6efd',
              fillOpacity: 0.35,
            }}
          >
            <Popup>A tua posição</Popup>
          </CircleMarker>
        )}
        {events.map((ev) => (
          <Marker key={ev.id} position={[ev.lat, ev.long]}>
            <Popup>
              <strong>{ev.title}</strong>
              <br />
              {ev.location_name ?? 'Local não indicado'}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
