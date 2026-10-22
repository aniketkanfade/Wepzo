import L from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;background:#0d9488;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.25)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export default function StoreMiniMap({ lat, lng }) {
  if (!lat || !lng) {
    return (
      <div className="h-full min-h-[200px] bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-400">
        Map unavailable
      </div>
    );
  }

  return (
    <div className="h-full min-h-[200px] rounded-lg overflow-hidden border border-gray-200">
      <MapContainer center={[lat, lng]} zoom={15} className="h-full w-full" scrollWheelZoom={false} dragging>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}
