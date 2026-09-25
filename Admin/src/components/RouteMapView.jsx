import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const WEPZO_BLUE = '#2563eb';
const WEPZO_ORANGE = '#f97316';

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(points, { padding: [48, 48], maxZoom: 16 });
    }
  }, [map, points]);
  return null;
}

function storeIcon() {
  return L.divIcon({
    className: 'wepzo-map-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.35))">
        <div style="background:${WEPZO_BLUE};color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;margin-bottom:2px;white-space:nowrap;border:2px solid #fff">STORE</div>
        <div style="width:36px;height:36px;background:#fff;border:3px solid ${WEPZO_BLUE};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px">🏪</div>
        <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid ${WEPZO_BLUE};margin-top:-1px"></div>
      </div>`,
    iconSize: [80, 70],
    iconAnchor: [40, 68],
  });
}

function riderIcon() {
  return L.divIcon({
    className: 'wepzo-map-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.35))">
        <div style="background:${WEPZO_ORANGE};color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;margin-bottom:2px;border:2px solid #fff">WEPZO RIDER</div>
        <div style="position:relative;width:40px;height:40px;background:#fff;border:3px solid ${WEPZO_ORANGE};border-radius:50%;display:flex;align-items:center;justify-content:center">
          <span style="font-size:20px">🏍️</span>
          <span style="position:absolute;bottom:-2px;right:-4px;background:${WEPZO_BLUE};color:#fff;font-size:8px;font-weight:900;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff">W</span>
        </div>
        <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid ${WEPZO_ORANGE};margin-top:-1px"></div>
      </div>`,
    iconSize: [90, 75],
    iconAnchor: [45, 73],
  });
}

export default function RouteMapView({ storeRef, rider }) {
  const [routeCoords, setRouteCoords] = useState(null);
  const [loading, setLoading] = useState(true);

  const storePos = [storeRef.lat, storeRef.lng];
  const riderPos = [rider.lat, rider.lng];
  const center = [(storeRef.lat + rider.lat) / 2, (storeRef.lng + rider.lng) / 2];

  useEffect(() => {
    if (!storeRef?.lat || !rider?.lat) return;
    setLoading(true);
    const url = `https://router.project-osrm.org/route/v1/driving/${storeRef.lng},${storeRef.lat};${rider.lng},${rider.lat}?overview=full&geometries=geojson`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords)) {
          setRouteCoords(coords.map(([lng, lat]) => [lat, lng]));
        } else {
          setRouteCoords([storePos, riderPos]);
        }
      })
      .catch(() => setRouteCoords([storePos, riderPos]))
      .finally(() => setLoading(false));
  }, [storeRef.lat, storeRef.lng, rider.lat, rider.lng]);

  const routeLine = routeCoords || [storePos, riderPos];
  const boundsPoints = useMemo(() => routeLine, [routeLine]);

  const dist = rider.distanceLabel || '';

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-lg bg-white">
      <div className="absolute top-2 left-2 z-[1000] flex items-center gap-1.5 pointer-events-none">
        <span className="text-[9px] font-black text-white bg-primary-600 px-2 py-0.5 rounded-full shadow">WEPZO</span>
        <span className="text-[9px] font-bold text-gray-700 bg-white/95 px-2 py-0.5 rounded-full shadow border border-gray-100">Live Map</span>
      </div>
      {dist && (
        <span className="absolute top-2 right-2 z-[1000] text-[10px] font-bold text-orange-700 bg-white/95 px-2.5 py-0.5 rounded-full shadow border border-orange-100 pointer-events-none">
          {dist}
        </span>
      )}

      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        className="h-56 w-full z-0"
        style={{ height: '224px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={boundsPoints} />

        <Polyline
          positions={routeLine}
          pathOptions={{ color: WEPZO_BLUE, weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
        />
        <Polyline
          positions={routeLine}
          pathOptions={{ color: '#fff', weight: 2, opacity: 0.6, dashArray: '6 8', lineCap: 'round' }}
        />

        <Marker position={storePos} icon={storeIcon()}>
          <Popup>
            <div className="text-xs min-w-[140px]">
              <p className="font-bold text-primary-600 mb-1">🏪 {storeRef.name}</p>
              <p className="text-gray-600">{storeRef.location || storeRef.address || storeRef.area}</p>
            </div>
          </Popup>
        </Marker>

        <Marker position={riderPos} icon={riderIcon()}>
          <Popup>
            <div className="text-xs min-w-[140px]">
              <p className="font-bold text-orange-600 mb-1">🏍️ {rider.name}</p>
              <p className="text-gray-600">{rider.location}</p>
              {dist && <p className="font-bold text-primary-600 mt-1">Store se {dist}</p>}
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[999]">
          <span className="text-xs font-semibold text-primary-700 bg-white px-3 py-1.5 rounded-full shadow border">Route load ho rahi hai...</span>
        </div>
      )}

      <div className="flex justify-between gap-2 px-3 py-2 bg-gray-50 border-t border-gray-100 text-[10px]">
        <span className="font-semibold text-primary-700 truncate">📍 {storeRef.name}</span>
        <span className="font-semibold text-orange-600 truncate">🏍️ {rider.name}</span>
      </div>

      <style>{`.wepzo-map-marker{background:transparent!important;border:none!important}`}</style>
    </div>
  );
}
