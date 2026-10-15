import { useEffect } from 'react';
import { Bike, Store, UserRound } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerGlyphs = {
  store: '<path d="M2 8 4.5 3h11L18 8M3 8v9h14V8M2 8h16M7 17v-5h4v5M14 12h.01" />',
  customer: '<circle cx="10" cy="6" r="3" /><path d="M4 18v-1a6 6 0 0 1 12 0v1" />',
  rider: '<circle cx="5" cy="15" r="3" /><circle cx="16" cy="15" r="3" /><path d="m5 15 4-7 4 7H5l2.5-4.5H13M12 5h2l2 3" />',
};

function markerIcon(kind, color) {
  return L.divIcon({
    className: 'rider-availability-marker',
    html: `<span role="img" aria-label="${kind}" style="display:block;width:40px;height:48px;filter:drop-shadow(0 2px 3px #0005)"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48"><path d="M20 1C9.5 1 1 9.4 1 19.5 1 32 20 47 20 47s19-15 19-27.5C39 9.4 30.5 1 20 1Z" fill="${color}" stroke="white" stroke-width="2"/><g transform="translate(10 9)" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${markerGlyphs[kind]}</g></svg></span>`,
    iconSize: [40, 48],
    iconAnchor: [20, 47],
  });
}

const storeIcon = markerIcon('store', '#2563eb');
const customerIcon = markerIcon('customer', '#7c3aed');
const riderIcon = markerIcon('rider', '#059669');

function FitMarkers({ points }) {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      if (points.length > 1) map.fitBounds(points, { padding: [36, 36], maxZoom: 15 });
      else if (points.length === 1) map.setView(points[0], 14);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [map, points]);
  return null;
}

export default function RiderAvailabilityMap({ storeRef, customerLocation, riders = [] }) {
  const isCoordinate = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Number(lat) !== 0 && Number(lng) !== 0;
  const storePoint = isCoordinate(storeRef?.lat, storeRef?.lng) ? [Number(storeRef.lat), Number(storeRef.lng)] : null;
  const customerPoint = isCoordinate(customerLocation?.lat, customerLocation?.lng) ? [Number(customerLocation.lat), Number(customerLocation.lng)] : null;
  const riderPoints = riders.filter(rider => isCoordinate(rider.lat, rider.lng));
  const points = [storePoint, customerPoint, ...riderPoints.map(rider => [Number(rider.lat), Number(rider.lng)])].filter(Boolean);
  const center = storePoint || customerPoint || (riderPoints[0] ? [Number(riderPoints[0].lat), Number(riderPoints[0].lng)] : [21.1458, 79.0882]);

  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="h-52 w-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitMarkers points={points} />
      {storePoint && <Marker position={storePoint} icon={storeIcon}><Popup><strong>Store: {storeRef.name}</strong><br />{storeRef.location || storeRef.address || storeRef.area}</Popup></Marker>}
      {customerPoint && <Marker position={customerPoint} icon={customerIcon}><Popup><strong>Customer delivery location</strong><br />{customerLocation.address}</Popup></Marker>}
      {riderPoints.map(rider => <Marker key={rider._id} position={[Number(rider.lat), Number(rider.lng)]} icon={riderIcon}>
        <Popup><strong>{rider.name}</strong><br />Available rider {rider.distanceLabel ? `· ${rider.distanceLabel} from store` : ''}<br />{rider.location || rider.area}</Popup>
      </Marker>)}
    </MapContainer>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-3 py-2 text-[10px] text-slate-600">
      <span className="inline-flex items-center gap-1.5"><Store size={13} className="text-blue-600" />Store</span>
      <span className="inline-flex items-center gap-1.5"><UserRound size={13} className="text-violet-600" />Customer</span>
      <span className="inline-flex items-center gap-1.5"><Bike size={13} className="text-emerald-600" />Delivery partner / riders</span>
      {!customerPoint && <span className="text-amber-700">Customer coordinates unavailable</span>}
    </div>
  </div>;
}
