import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { pointsForRoute } from '../utils/eta';

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asPoint(lat, lng) {
  const a = num(lat);
  const b = num(lng);
  if (a == null || b == null) return null;
  return { lat: a, lng: b };
}

function isPickedUp(order) {
  const st = String(order?.status || '').toLowerCase();
  if (/out for|ofd|handover|picked|deliver/.test(st)) return true;
  return (order?.timeline || []).some(t => (t.key === 'picked' || t.key === 'ofd') && t.done);
}

function hasAssignedRider(order) {
  return !!order?.rider?.name;
}

const markerArt = {
  store: '<path d="M3 9h18v11H3zM2 9l2-5h16l2 5M7 20v-6h4v6M15 13h3M7 13h3"/>',
  rider: '<circle cx="5" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><circle cx="13" cy="4" r="2"/><path d="m12 7-3 5 4 2 2-5 3 3M9 12H5l4-5M13 14h5l-3-5"/>',
  customer: '<circle cx="12" cy="7" r="3"/><path d="M5 21v-1.5a7 7 0 0 1 14 0V21M8 13l4 3 4-3"/>',
};

function marker(kind, color, shadowColor, label) {
  return L.divIcon({
    className: 'qc-track-pin',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-10px);filter:drop-shadow(0 7px 6px rgba(15,23,42,.28))">
      <div style="position:relative;width:44px;height:44px;border-radius:17px 17px 17px 5px;background:linear-gradient(145deg,#fff 0%,${color} 24%,${shadowColor} 100%);transform:rotate(-45deg);border:3px solid #fff;box-shadow:inset 2px 2px 3px rgba(255,255,255,.45),inset -3px -3px 5px rgba(0,0,0,.16)">
        <span style="position:absolute;inset:0;display:grid;place-items:center;transform:rotate(45deg)"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${markerArt[kind]}</svg></span>
      </div>
      <span style="margin-top:6px;font-size:9px;font-weight:900;letter-spacing:.06em;color:#0f172a;background:linear-gradient(180deg,#fff,#f8fafc);padding:3px 8px;border:1px solid #e2e8f0;border-radius:999px;box-shadow:0 3px 8px rgba(15,23,42,.16);white-space:nowrap">${label}</span>
    </div>`,
    iconSize: [100, 66],
    iconAnchor: [50, 42],
  });
}

const storeIcon = marker('store', '#10b981', '#047857', 'STORE');
const customerIcon = marker('customer', '#3b82f6', '#1d4ed8', 'YOU');
const riderIcon = marker('rider', '#f97316', '#c2410c', 'RIDER');

function Fit({ points }) {
  const map = useMap();
  const key = points.map(p => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('|');
  useEffect(() => {
    if (!points.length) return;
    const b = L.latLngBounds(points);
    map.fitBounds(b.pad(0.22), { maxZoom: 15, animate: true });
  }, [map, key, points]);
  return null;
}

const routeCache = new Map();

function cacheKey(from, to) {
  return `${from.lng.toFixed(5)},${from.lat.toFixed(5)};${to.lng.toFixed(5)},${to.lat.toFixed(5)}`;
}

async function fetchDrivingRoute(from, to) {
  const key = cacheKey(from, to);
  if (routeCache.has(key)) return routeCache.get(key);
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('osrm');
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) throw new Error('empty');
    const line = coords.map(([lng, lat]) => [lat, lng]);
    routeCache.set(key, line);
    return line;
  } catch {
    routeCache.set(key, null);
    return null;
  }
}

export default function TrackMap({ order }) {
  const pts = pointsForRoute(order);
  const store = asPoint(order?.storeLat, order?.storeLng)
    || pts.find(p => p.kind === 'store');
  const customer = asPoint(order?.lat, order?.lng)
    || pts.find(p => p.kind === 'customer');
  const assignedRider = hasAssignedRider(order);
  const rider = assignedRider
    ? asPoint(order.rider.lat, order.rider.lng)
    : null;
  const waiting = !assignedRider;
  const picked = isPickedUp(order);

  const [pickupPath, setPickupPath] = useState(null);
  const [dropPath, setDropPath] = useState(null);

  const routeKey = useMemo(() => {
    const parts = [
      waiting ? 'wait' : (picked ? 'drop' : 'pickup'),
      rider ? `${rider.lat.toFixed(4)},${rider.lng.toFixed(4)}` : '',
      store ? `${store.lat.toFixed(5)},${store.lng.toFixed(5)}` : '',
      customer ? `${customer.lat.toFixed(5)},${customer.lng.toFixed(5)}` : '',
    ];
    return parts.join('|');
  }, [waiting, picked, rider, store, customer]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (waiting) {
        setPickupPath(null);
        if (!cancelled) setDropPath(null);
        return;
      }
      if (!picked && rider && store) {
        const pickup = await fetchDrivingRoute(rider, store);
        if (!cancelled) setPickupPath(pickup);
      } else if (!cancelled) {
        setPickupPath(null);
      }
      if (picked && rider && customer) {
        const drop = await fetchDrivingRoute(rider, customer);
        if (!cancelled) setDropPath(drop);
      } else if (!cancelled) {
        setDropPath(null);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [routeKey, waiting, picked, rider, store, customer]);

  const fitPoints = useMemo(() => {
    const list = [];
    if (store) list.push([store.lat, store.lng]);
    if (customer) list.push([customer.lat, customer.lng]);
    if (rider) list.push([rider.lat, rider.lng]);
    return list;
  }, [store, customer, rider]);

  const center = store
    ? [store.lat, store.lng]
    : customer
      ? [customer.lat, customer.lng]
      : [21.1458, 79.0882];

  if (!store && !customer && !rider) {
    return (
      <div className="rounded-2xl min-h-[420px] h-[420px] bg-slate-100 border flex items-center justify-center text-sm text-slate-500">
        Location pins available nahi hain
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm min-h-[420px] h-[420px] z-0">
        <MapContainer center={center} zoom={13} className="h-full w-full min-h-[420px]" scrollWheelZoom>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {fitPoints.length >= 1 && <Fit points={fitPoints} />}
          {dropPath && dropPath.length >= 2 && (
            <Polyline
              positions={dropPath}
              pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.88, lineCap: 'round', lineJoin: 'round' }}
            />
          )}
          {pickupPath && pickupPath.length >= 2 && (
            <Polyline
              positions={pickupPath}
              pathOptions={{ color: '#ea580c', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
            />
          )}
          {store && (
            <Marker position={[store.lat, store.lng]} icon={storeIcon} zIndexOffset={400}>
              <Popup>Store · {order.store || 'Pickup'}</Popup>
            </Marker>
          )}
          {rider && (
            <Marker position={[rider.lat, rider.lng]} icon={riderIcon} zIndexOffset={600}>
              <Popup>Rider · {order.rider?.name}</Popup>
            </Marker>
          )}
          {customer && (
            <Marker position={[customer.lat, customer.lng]} icon={customerIcon} zIndexOffset={500}>
              <Popup>Drop · {order.address || 'Customer'}</Popup>
            </Marker>
          )}
        </MapContainer>
          {waiting && (
          <div className="absolute top-3 left-3 right-3 z-[500] pointer-events-none">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50/95 text-amber-800 text-xs font-semibold px-3 py-1.5 shadow border border-amber-200">
              Waiting for rider · store se aap tak ka route
            </div>
          </div>
        )}
          {assignedRider && !rider && (
            <div className="absolute top-3 left-3 right-3 z-[500] pointer-events-none">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/95 text-slate-700 text-xs font-semibold px-3 py-1.5 shadow border border-slate-200">
                Rider assigned · live GPS is not available yet
              </div>
            </div>
          )}
        <div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-white/95 shadow-md border border-slate-200 px-3 py-2 text-[11px] space-y-1.5">
          <p className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Legend</p>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Store</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Rider</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> You</div>
          <div className="flex items-center gap-2 pt-0.5 border-t"><span className="w-5 h-1 rounded bg-orange-500" /> Pickup path</div>
          <div className="flex items-center gap-2"><span className="w-5 h-1 rounded bg-blue-600" /> Drop path</div>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 px-0.5">
        {waiting
          ? 'Rider assign hone ke baad live pickup route dikhega.'
          : !rider
            ? `Rider location unavailable${order.rider?.locationUpdatedAt ? ` · last updated ${new Date(order.rider.locationUpdatedAt).toLocaleString()}` : ''}.`
          : picked
            ? 'Order pick ho chuka hai — rider se aap tak ka live drop route.'
            : 'Pehle rider store tak (orange), phir store se aap tak (blue).'}
      </p>
    </div>
  );
}
