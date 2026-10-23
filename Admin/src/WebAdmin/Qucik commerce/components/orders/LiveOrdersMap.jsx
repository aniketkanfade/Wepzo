import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

function getPoint(lat, lng) {
  if (lat === null || lat === undefined || lat === '' || lng === null || lng === undefined || lng === '') return null;
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180
    ? [a, b]
    : null;
}

function icon(label, color, glyph) {
  return L.divIcon({
    className: 'wepzo-live-order-marker',
    html: `<span style="display:grid;place-items:center;width:31px;height:31px;border:3px solid white;border-radius:50% 50% 50% 0;background:${color};color:white;box-shadow:0 3px 10px #0f172a55;font-size:12px;font-weight:900;transform:rotate(-45deg)"><span style="transform:rotate(45deg)">${glyph}</span></span><small style="display:block;margin-top:2px;padding:2px 5px;border-radius:20px;background:#fff;color:#0f172a;font-size:8px;font-weight:800;text-align:center;box-shadow:0 1px 5px #0f172a44">${label}</small>`,
    iconSize: [78, 48],
    iconAnchor: [39, 30],
  });
}

const storeIcon = icon('STORE', '#059669', 'S');
const riderIcon = icon('RIDER', '#ea580c', 'W');
const customerIcon = icon('DROP', '#2563eb', 'D');

function Bounds({ points }) {
  const map = useMap();
  const key = points.map(point => point.join(',')).join('|');
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points).pad(0.15), { maxZoom: 14 });
  }, [map, key, points]);
  return null;
}

export default function LiveOrdersMap({ orders = [], onSelectOrder }) {
  const rows = useMemo(() => orders.flatMap(order => {
    const rider = getPoint(order.rider?.lat, order.rider?.lng);
    const store = getPoint(order.storeLat, order.storeLng);
    const customer = getPoint(order.lat, order.lng);
    return [
      ...(store ? [{ order, point: store, icon: storeIcon, title: `Store · ${order.store || 'Pickup'}` }] : []),
      ...(rider ? [{ order, point: rider, icon: riderIcon, title: `Rider · ${order.rider?.name || 'Assigned'}` }] : []),
      ...(customer ? [{ order, point: customer, icon: customerIcon, title: `Drop · #${order.orderNo || order.orderId || ''}` }] : []),
    ];
  }), [orders]);
  const points = useMemo(() => rows.map(row => row.point), [rows]);
  const center = points[0] || [21.1458, 79.0882];

  return <div className="relative h-[430px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-[520px]">
    <MapContainer center={center} zoom={6} className="h-full w-full" scrollWheelZoom>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url={import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
      {points.length > 0 && <Bounds points={points} />}
      {rows.map((row, index) => <Marker
        key={`${row.order._id}-${row.title}-${index}`}
        position={row.point}
        icon={row.icon}
        eventHandlers={{ click: () => onSelectOrder?.(row.order) }}
      >
        <Popup>
          <strong>#{row.order.orderNo || row.order.orderId || row.order._id}</strong><br />
          {row.title}<br />
          {row.order.status}<br />
          <button type="button" onClick={() => onSelectOrder?.(row.order)} style={{ marginTop: 6, color: '#1d4ed8', fontWeight: 700 }}>Open order details</button>
        </Popup>
      </Marker>)}
    </MapContainer>
    {!orders.length && <div className="pointer-events-none absolute inset-0 z-[400] grid place-items-center"><p className="rounded-xl bg-white/95 px-4 py-3 text-sm font-semibold text-slate-600 shadow">No active deliveries match these filters.</p></div>}
    <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[10px] font-semibold text-slate-600 shadow">
      <span className="text-emerald-700">● Store</span><span className="text-orange-600">● Rider GPS</span><span className="text-blue-600">● Customer drop</span>
    </div>
  </div>;
}
