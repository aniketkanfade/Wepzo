import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { pointsForRoute } from '../utils/eta';

function num(v) {
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
  return !!(order?.rider?.name && asPoint(order.rider.lat, order.rider.lng));
}

function teardrop(color, label, letter) {
  return L.divIcon({
    className: 'qc-track-pin',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-6px)">
      <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);color:#fff;font-size:13px;font-weight:800;line-height:1">${letter}</span>
      </div>
      <span style="margin-top:4px;font-size:10px;font-weight:800;letter-spacing:.04em;color:#0f172a;background:#fff;padding:2px 7px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.18);white-space:nowrap">${label}</span>
    </div>`,
    iconSize: [88, 52],
    iconAnchor: [44, 30],
  });
}

const storeIcon = teardrop('#059669', 'STORE', 'S');
const customerIcon = teardrop('#2563eb', 'YOU', 'Y');
const riderIcon = teardrop('#ea580c', 'RIDER', 'R');

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

function fallbackLine(from, to) {
  return [[from.lat, from.lng], [to.lat, to.lng]];
}

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
    const line = fallbackLine(from, to);
    routeCache.set(key, line);
    return line;
  }
}

export default function TrackMap({ order }) {
  const pts = pointsForRoute(order);
  const store = asPoint(order?.storeLat, order?.storeLng)
    || pts.find(p => p.kind === 'store');
  const customer = asPoint(order?.lat, order?.lng)
    || pts.find(p => p.kind === 'customer');
  const rider = hasAssignedRider(order)
    ? asPoint(order.rider.lat, order.rider.lng)
    : null;
  const waiting = !rider;
  const picked = isPickedUp(order);

  const [pickupPath, setPickupPath] = useState(null);
  const [dropPath, setDropPath] = useState(null);

  const routeKey = useMemo(() => {
    const parts = [
      waiting ? 'wait' : (picked ? 'drop' : 'pickup'),
      rider ? `${rider.lat.toFixed(5)},${rider.lng.toFixed(5)}` : '',
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
        if (store && customer) {
          const drop = await fetchDrivingRoute(store, customer);
          if (!cancelled) setDropPath(drop);
        } else if (!cancelled) setDropPath(null);
        return;
      }
      if (!picked && rider && store) {
        const pickup = await fetchDrivingRoute(rider, store);
        if (!cancelled) setPickupPath(pickup);
      } else if (!cancelled) {
        setPickupPath(null);
      }
      const dropFrom = picked && rider ? rider : store;
      if (dropFrom && customer) {
        const drop = await fetchDrivingRoute(dropFrom, customer);
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
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
          : picked
            ? 'Order pick ho chuka hai — rider se aap tak ka live drop route.'
            : 'Pehle rider store tak (orange), phir store se aap tak (blue).'}
      </p>
    </div>
  );
}
