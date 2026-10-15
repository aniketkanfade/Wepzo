import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polygon, GeoJSON, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { getZoneCenter, isInsideZone, isInsideDeliveryZone, pointInPolygon } from '../../../constants/storeZones';
import { reverseGeocode, searchAddress } from '../../../utils/geocode';

function ClickHandler({ onPick, zone }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const INDIA_CENTER = [22.9734, 78.6569];

function ZoneFit({ zone, zoneData, stateBoundary }) {
  const map = useMap();
  useEffect(() => {
    if (stateBoundary) {
      map.setView(INDIA_CENTER, 5);
      return;
    }
    if (zoneData?.polygon?.length >= 3) {
      map.fitBounds(zoneData.polygon.map(p => [p.lat, p.lng]), { padding: [20, 20], maxZoom: 14 });
      return;
    }
    const c = getZoneCenter(zone);
    if (c) map.flyTo([c.lat, c.lng], 14, { duration: 0.6 });
  }, [zone, zoneData, stateBoundary, map]);
  return null;
}

function FlyToPin({ lat, lng, enabled = true }) {
  const map = useMap();
  useEffect(() => {
    if (enabled && lat && lng) map.panTo([lat, lng], { animate: true });
  }, [lat, lng, enabled, map]);
  return null;
}

function MapViewControl({ stateBoundary, searchArea }) {
  const map = useMap();
  const stateView = () => {
    if (!stateBoundary) return;
    const bounds = L.geoJSON(stateBoundary).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [18, 18], maxZoom: 7 });
  };
  const areaView = () => {
    if (!searchArea) return;
    const bounds = L.geoJSON(searchArea).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [22, 22], maxZoom: 13 });
  };
  return <div className="absolute right-2 top-2 z-[1000] flex flex-col gap-1.5">
    <button type="button" onClick={() => map.setView(INDIA_CENTER, 5)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow hover:bg-slate-50">India view</button>
    {stateBoundary && <button type="button" onClick={stateView} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 shadow hover:bg-slate-50">State view</button>}
    {searchArea && <button type="button" onClick={areaView} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 shadow hover:bg-slate-50">PIN / area view</button>}
  </div>;
}

function geoContainsPoint(geojson, lat, lng) {
  const geometry = geojson?.type === 'Feature' ? geojson.geometry : geojson;
  if (!geometry || lat == null || lng == null) return false;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  return polygons.some(polygon => (polygon[0] || []).length >= 3
    && pointInPolygon(lat, lng, polygon[0].map(([x, y]) => ({ lat: y, lng: x }))));
}

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:32px;height:32px;background:#2563eb;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,.3)"></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function StoreLocationMap({ zone, zoneData, lat, lng, onLocationChange, allowAnyLocation = false, locationSelected = true }) {
  const centroid = zoneData?.polygon?.length >= 3
    ? [
        zoneData.polygon.reduce((s, p) => s + p.lat, 0) / zoneData.polygon.length,
        zoneData.polygon.reduce((s, p) => s + p.lng, 0) / zoneData.polygon.length,
      ]
    : null;
  const center = getZoneCenter(zone);
  const mapCenter = centroid || (center ? [center.lat, center.lng] : INDIA_CENTER);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [zoneError, setZoneError] = useState('');
  const [stateBoundary, setStateBoundary] = useState(null);
  const [searchArea, setSearchArea] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    const state = zoneData?.state;
    if (!state || zoneData?.commerceType !== 'ecommerce') {
      setStateBoundary(null);
      return undefined;
    }
    let cancelled = false;
    const params = new URLSearchParams({ q: `${state}, India`, format: 'jsonv2', addressdetails: '1', polygon_geojson: '1', countrycodes: 'in', limit: '1' });
    fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': 'en' } })
      .then(response => response.ok ? response.json() : [])
      .then(results => { if (!cancelled) setStateBoundary(results?.[0]?.geojson || null); })
      .catch(() => { if (!cancelled) setStateBoundary(null); });
    return () => { cancelled = true; };
  }, [zoneData?.state, zoneData?.commerceType]);

  const inZone = useCallback((la, ln) => (
    allowAnyLocation
      ? true
      : zoneData
      ? (zoneData.commerceType === 'ecommerce' && ['country', 'state', 'city'].includes(zoneData.scope)
        ? (zoneData.scope !== 'state' || !stateBoundary || geoContainsPoint(stateBoundary, la, ln))
        : isInsideDeliveryZone(zoneData, la, ln))
      : isInsideZone(zone, la, ln)
  ), [allowAnyLocation, zone, zoneData, stateBoundary]);

  const pickLocation = useCallback(async (newLat, newLng, addressLabel, postalCode) => {
    if (!zone && !allowAnyLocation) {
      setZoneError('Pehle Business zone select karein');
      return;
    }
    if (!inZone(newLat, newLng)) {
      setZoneError(`Location "${zone}" zone ke bahar hai — sirf zone ke andar select karein`);
      return;
    }
    setZoneError('');
    setGeoLoading(true);
    const geocoded = addressLabel ? null : await reverseGeocode(newLat, newLng);
    const address = addressLabel || geocoded?.address || '';
    const pincode = postalCode || geocoded?.pincode || '';
    setGeoLoading(false);
    onLocationChange?.({ lat: newLat, lng: newLng, address, pincode });
    setResults([]);
    setSearch('');
  }, [zone, allowAnyLocation, inZone, onLocationChange]);

  useEffect(() => {
    if (!search.trim() || (!zone && !allowAnyLocation)) {
      setResults([]);
      return;
    }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const list = await searchAddress(search, zone, zoneData, allowAnyLocation);
      setResults(list);
      setSearching(false);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search, zone, zoneData, allowAnyLocation]);

  if (!zone && !allowAnyLocation) {
    return (
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 h-[320px] flex flex-col items-center justify-center text-center p-6">
        <AlertCircle size={32} className="text-amber-500 mb-2" />
        <p className="text-sm font-semibold text-amber-800">Pehle Business zone select karein</p>
        <p className="text-xs text-amber-600 mt-1">Map tabhi enable hoga jab zone choose ho</p>
      </div>
    );
  }

  const zoneCenter = zoneData?.polygon?.length >= 3
    ? {
        lat: zoneData.polygon.reduce((s, p) => s + p.lat, 0) / zoneData.polygon.length,
        lng: zoneData.polygon.reduce((s, p) => s + p.lng, 0) / zoneData.polygon.length,
        radiusKm: zoneData.radiusKm || 0,
      }
    : getZoneCenter(zone);
  const polyPositions = (zoneData?.polygon || []).filter(p => p?.lat != null).map(p => [p.lat, p.lng]);

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={allowAnyLocation ? 'Search business location or 6-digit PIN in India...' : `Search area, city or 6-digit PIN in ${zone}...`}
          className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/25 bg-white"
        />
        {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        {results.length > 0 && (
          <div className="absolute z-[1000] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <button key={i} type="button" onClick={() => { setSearchArea(r.geojson || null); pickLocation(r.lat, r.lng, r.label, r.pincode); }}
                className="w-full text-left px-3 py-2.5 text-xs text-gray-700 hover:bg-primary-50 border-b border-gray-50 last:border-0 flex gap-2">
                <MapPin size={12} className="text-primary-500 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{r.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 h-[300px] relative">
        <MapContainer center={mapCenter} zoom={5} className="h-full w-full z-0" scrollWheelZoom>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          {stateBoundary && <GeoJSON key={`${zoneData?.state}-state-boundary`} data={stateBoundary} style={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.13, weight: 2.5 }} />}
          {searchArea && <GeoJSON key={`search-area-${search}`} data={searchArea} style={{ color: '#4f46e5', fillColor: '#818cf8', fillOpacity: 0.24, weight: 2.5 }} />}
          {polyPositions.length >= 3 && (
            <Polygon
              positions={polyPositions}
              pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.2, weight: 3 }}
            />
          )}
          {zoneCenter && zoneCenter.radiusKm > 0 && (
            <Circle
              center={[zoneCenter.lat, zoneCenter.lng]}
              radius={zoneCenter.radiusKm * 1000}
              pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.06, weight: 2, dashArray: '6 4' }}
            />
          )}
          <ZoneFit zone={zone} zoneData={zoneData} stateBoundary={stateBoundary} />
          <ClickHandler onPick={pickLocation} zone={zone} />
          <FlyToPin lat={lat} lng={lng} enabled={!stateBoundary && (!allowAnyLocation || locationSelected)} />
          <MapViewControl stateBoundary={stateBoundary} searchArea={searchArea} />
          {lat && lng && inZone(lat, lng) && (!allowAnyLocation || locationSelected) && (
            <Marker
              position={[lat, lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat: la, lng: ln } = e.target.getLatLng();
                  pickLocation(la, ln);
                },
              }}
            />
          )}
        </MapContainer>

        {geoLoading && (
          <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-[500]">
            <Loader2 size={24} className="animate-spin text-primary-600" />
          </div>
        )}

        <p className="absolute bottom-2 left-2 right-2 text-[10px] bg-white/95 rounded px-2 py-1 text-gray-500 text-center pointer-events-none shadow-sm">
          <span className="text-blue-700 font-semibold">{allowAnyLocation ? 'India' : zoneData?.state || zone}</span> {allowAnyLocation ? 'mein business location select karein' : 'state/zone ke andar select karein'} · PIN code se bhi search karein
        </p>
      </div>

      {zoneError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <AlertCircle size={13} /> {zoneError}
        </p>
      )}
    </div>
  );
}
