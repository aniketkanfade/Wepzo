import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { isInsideCity } from '../constants/geo';

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;background:#ec4899;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function ClickPick({ city, onPick }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (city && !isInsideCity(city, lat, lng)) {
        onPick(null, 'Sirf selected city ke andar pin lagao');
        return;
      }
      onPick({ lat, lng });
    },
  });
  return null;
}

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  return null;
}

export default function LocationMap({ city, lat, lng, onPick, error }) {
  const center = [lat || city?.lat || 21.1458, lng || city?.lng || 79.0882];
  return (
    <div>
      <div className="relative h-56 rounded-xl overflow-hidden border border-slate-200">
        <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {city && (
            <Circle center={[city.lat, city.lng]} radius={city.radiusKm * 1000}
              pathOptions={{ color: '#ec4899', fillOpacity: 0.06, weight: 1, dashArray: '4 4' }} />
          )}
          <ClickPick city={city} onPick={onPick} />
          <Recenter lat={lat} lng={lng} />
          {lat && lng && <Marker position={[lat, lng]} icon={pinIcon} />}
        </MapContainer>
      </div>
      <p className="text-[11px] text-slate-500 mt-1.5">Map pe click karke pin lagao — sirf {city?.name || 'city'} ke andar.</p>
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
