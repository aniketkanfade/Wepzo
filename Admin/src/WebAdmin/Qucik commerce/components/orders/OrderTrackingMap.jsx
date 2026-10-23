import { useEffect, useMemo, useState } from 'react';
import { Bike, MapPin } from 'lucide-react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

function point(lat, lng) {
  if (lat === null || lat === undefined || lat === '' || lng === null || lng === undefined || lng === '') return null;
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < -90 || a > 90 || b < -180 || b > 180) return null;
  return { lat: a, lng: b };
}

function marker(label, glyph, color) {
  return L.divIcon({
    className: 'wepzo-order-map-marker',
    html: `<span style="display:grid;place-items:center;width:34px;height:34px;border:3px solid #fff;border-radius:50% 50% 50% 0;background:${color};color:#fff;box-shadow:0 4px 12px #0f172a44;font-size:12px;font-weight:900;transform:rotate(-45deg)"><span style="transform:rotate(45deg)">${glyph}</span></span><small style="display:block;margin-top:3px;padding:2px 6px;border-radius:999px;background:white;color:#0f172a;font-size:9px;font-weight:800;text-align:center;box-shadow:0 2px 6px #0f172a33">${label}</small>`,
    iconSize: [76, 52],
    iconAnchor: [38, 31],
  });
}

const storeIcon = marker('STORE', 'S', '#059669');
const customerIcon = marker('CUSTOMER', 'C', '#2563eb');
const riderIcon = marker('WEPZO RIDER', 'W', '#ea580c');
const routeCache = new Map();

async function route(from, to) {
  const key = `${from.lng.toFixed(3)},${from.lat.toFixed(3)};${to.lng.toFixed(3)},${to.lat.toFixed(3)}`;
  if (routeCache.has(key)) return routeCache.get(key);
  try {
    const baseUrl = import.meta.env.VITE_ROUTING_URL || 'https://router.project-osrm.org';
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`);
    if (!response.ok) throw new Error('route');
    const data = await response.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) throw new Error('route');
    const line = coords.map(([lng, lat]) => [lat, lng]);
    routeCache.set(key, line);
    return line;
  } catch {
    routeCache.set(key, null);
    return null;
  }
}

function FitBounds({ points }) {
  const map = useMap();
  const key = points.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join('|');
  useEffect(() => {
    if (points.length) map.fitBounds(L.latLngBounds(points).pad(0.2), { maxZoom: 15 });
  }, [key, map, points]);
  return null;
}

function pickedUp(order) {
  return order?.status === 'Out for Delivery'
    || (order?.timeline || []).some(item => ['picked', 'ofd'].includes(item.key) && item.done);
}

export default function OrderTrackingMap({ order, className = '' }) {
  const store = useMemo(() => point(order?.storeLat, order?.storeLng), [order?.storeLat, order?.storeLng]);
  const customer = useMemo(() => point(order?.lat, order?.lng), [order?.lat, order?.lng]);
  const rider = useMemo(() => point(order?.rider?.lat, order?.rider?.lng), [order?.rider?.lat, order?.rider?.lng]);
  const picked = pickedUp(order);
  const routeOrigin = picked && rider ? rider : store;
  const [path, setPath] = useState(null);
  const [pickupPath, setPickupPath] = useState(null);
  const routeKey = [routeOrigin, customer, rider, store].map(value => value ? `${value.lat.toFixed(3)},${value.lng.toFixed(3)}` : '-').join('|');

  useEffect(() => {
    let active = true;
    async function loadRoute() {
      if (routeOrigin && customer && (routeOrigin.lat !== customer.lat || routeOrigin.lng !== customer.lng)) {
        const line = await route(routeOrigin, customer);
        if (active) setPath(line);
      } else if (active) setPath(null);
      if (!picked && rider && store) {
        const line = await route(rider, store);
        if (active) setPickupPath(line);
      } else if (active) setPickupPath(null);
    }
    loadRoute();
    return () => { active = false; };
  }, [routeKey, routeOrigin, customer, rider, store, picked]);

  const points = useMemo(() => [store, customer, rider].filter(Boolean).map(item => [item.lat, item.lng]), [store, customer, rider]);
  const centerPoint = store || customer || rider;
  const updatedAt = order?.rider?.locationUpdatedAt;

  if (!centerPoint) return <div className={`flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-5 text-center text-sm text-slate-500 ${className}`}>
    <div><MapPin size={20} className="mx-auto mb-2 text-slate-400" />Order coordinates are unavailable.</div>
  </div>;

  return <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
      <div><p className="text-sm font-extrabold text-slate-900">Live order route</p><p className="mt-0.5 text-[11px] text-slate-500">{rider ? `Rider location received ${updatedAt ? new Date(updatedAt).toLocaleString() : 'just now'}` : order?.rider?.name ? 'Rider GPS location unavailable' : 'Waiting for rider assignment'}</p></div>
      {rider && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800"><Bike size={13} /> Live GPS</span>}
    </div>
    <div className="relative h-[340px] sm:h-[410px]">
      <MapContainer center={[centerPoint.lat, centerPoint.lng]} zoom={13} className="h-full w-full" scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url={import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
        <FitBounds points={points} />
        {path?.length > 1 && <Polyline positions={path} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.9, lineCap: 'round' }} />}
        {pickupPath?.length > 1 && <Polyline positions={pickupPath} pathOptions={{ color: '#ea580c', weight: 5, opacity: 0.9, lineCap: 'round', dashArray: '7 7' }} />}
        {store && <Marker position={[store.lat, store.lng]} icon={storeIcon}><Popup>Store · {order.store || order.storeName || 'Pickup'}</Popup></Marker>}
        {rider && <Marker position={[rider.lat, rider.lng]} icon={riderIcon}><Popup>WEPZO rider · {order.rider?.name || 'Delivery rider'}</Popup></Marker>}
        {customer && <Marker position={[customer.lat, customer.lng]} icon={customerIcon}><Popup>Customer delivery destination</Popup></Marker>}
      </MapContainer>
    </div>
    {order?.rider?.name && !rider && <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-amber-800">Rider assigned. Waiting for the rider app to send a real GPS update{updatedAt ? ` · last update ${new Date(updatedAt).toLocaleString()}` : ''}.</p>}
  </section>;
}
