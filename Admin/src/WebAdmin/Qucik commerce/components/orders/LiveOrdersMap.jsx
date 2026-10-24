import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

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

function riderStatus(rider) {
  if (rider.activeOrder?.status === 'Out for Delivery') return { label: 'Out for delivery', color: '#dc2626' };
  if (rider.activeOrdersCount > 0) return { label: 'Order assigned', color: '#ea580c' };
  if (!rider.online) return { label: 'Offline · last known GPS', color: '#64748b' };
  return { label: rider.gpsFresh ? 'Online · no assigned order' : 'Online · waiting for GPS', color: '#059669' };
}

function riderMapIcon(color) {
  return L.divIcon({
    className: 'wepzo-live-order-marker',
    html: `<span style="display:grid;place-items:center;width:34px;height:34px;border:3px solid white;border-radius:50%;background:${color};color:white;box-shadow:0 3px 10px #0f172a66;font-size:14px;font-weight:900">R</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function Bounds({ points, fitKey }) {
  const map = useMap();
  const lastFitKey = useRef('');
  useEffect(() => {
    if (!points.length || lastFitKey.current === fitKey) return;
    lastFitKey.current = fitKey;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points).pad(0.15), { maxZoom: 14 });
  }, [map, fitKey, points]);
  return null;
}

export default function LiveOrdersMap({ orders = [], riders = [], onSelectOrder }) {
  const rows = useMemo(() => orders.flatMap(order => {
    const store = getPoint(order.storeLat, order.storeLng);
    const customer = getPoint(order.lat, order.lng);
    return [
      ...(store ? [{ order, point: store, icon: storeIcon, title: `Store · ${order.store || 'Pickup'}` }] : []),
      ...(customer ? [{ order, point: customer, icon: customerIcon, title: `Drop · #${order.orderNo || order.orderId || ''}` }] : []),
    ];
  }), [orders]);
  const riderRows = useMemo(() => riders.flatMap(rider => {
    const point = getPoint(rider.lat, rider.lng);
    if (!point) return [];
    const status = riderStatus(rider);
    const destination = getPoint(rider.activeOrder?.destinationLat, rider.activeOrder?.destinationLng);
    return [{ rider, point, status, icon: riderMapIcon(status.color), destination }];
  }), [riders]);
  const routeRows = riderRows.filter(row => row.destination && row.rider.activeOrder?.status === 'Out for Delivery');
  const points = useMemo(() => [
    ...rows.map(row => row.point),
    ...riderRows.flatMap(row => [row.point, ...(row.destination ? [row.destination] : [])]),
  ], [rows, riderRows]);
  const fitKey = useMemo(() => [
    ...orders.map(order => `order:${order._id}`),
    ...riders.map(rider => `rider:${rider._id}`),
  ].join('|'), [orders, riders]);
  const center = points[0] || [21.1458, 79.0882];

  return <div className="relative h-[430px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-[520px]">
    <MapContainer center={center} zoom={6} className="h-full w-full" scrollWheelZoom>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url={import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
      {points.length > 0 && <Bounds points={points} fitKey={fitKey} />}
      {routeRows.map(({ rider, point, destination, status }) => <Polyline key={`route-${rider._id}`} positions={[point, destination]} pathOptions={{ color: status.color, weight: 4, opacity: 0.75, dashArray: '8 8' }} />)}
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
      {riderRows.map(({ rider, point, status, icon: markerIcon, destination }) => <Marker key={`rider-${rider._id}`} position={point} icon={markerIcon}>
        <Popup>
          <strong>{rider.name || 'Delivery rider'}</strong><br />
          <span style={{ color: status.color, fontWeight: 700 }}>{status.label}</span><br />
          Zone: {rider.area || 'Not set'}<br />
          {rider.activeOrder ? <>
            Order: #{rider.activeOrder.orderNo}<br />
            Status: {rider.activeOrder.status}<br />
            Destination: {rider.activeOrder.area || 'Customer location'}<br />
            {rider.activeOrdersCount > 1 && <>{rider.activeOrdersCount} active orders assigned<br /></>}
            {destination && <button type="button" onClick={() => onSelectOrder?.({ _id: rider.activeOrder._id })} style={{ marginTop: 6, color: '#1d4ed8', fontWeight: 700 }}>Open assigned order</button>}
          </> : 'No active order assigned'}
          {rider.locationUpdatedAt && <><br />Last GPS: {new Date(rider.locationUpdatedAt).toLocaleTimeString()}{rider.gpsFresh ? '' : ' · stale'}</>}
        </Popup>
      </Marker>)}
    </MapContainer>
    {!orders.length && !riderRows.length && <div className="pointer-events-none absolute inset-0 z-[400] grid place-items-center"><p className="rounded-xl bg-white/95 px-4 py-3 text-sm font-semibold text-slate-600 shadow">No active deliveries or riders with current GPS.</p></div>}
    <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[10px] font-semibold text-slate-600 shadow">
      <span className="text-red-600">● On the way</span><span className="text-orange-600">● Order assigned</span><span className="text-emerald-700">● Online, no order</span><span className="text-slate-500">● Offline / stale last GPS</span><span className="text-blue-600">● Customer drop</span><span className="text-emerald-700">● Store</span>
    </div>
  </div>;
}
