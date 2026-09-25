import { useEffect, useState, Component } from 'react';
import { MapContainer, TileLayer, Circle, Polygon, Polyline, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, Undo2, Trash2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { isInsideCity } from '../constants/locations';

const vertexIcon = (first) => L.divIcon({
  className: '',
  html: first
    ? `<div style="width:16px;height:16px;background:#22c55e;border:3px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>`
    : `<div style="width:12px;height:12px;background:#fff;border:3px solid #ef4444;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: first ? [16, 16] : [12, 12],
  iconAnchor: first ? [8, 8] : [6, 6],
});

function ClickDraw({ onClick, firstPoint, canClose, enabled }) {
  const map = useMapEvents({
    click(e) {
      if (!enabled) return;
      if (canClose && firstPoint) {
        const a = map.latLngToContainerPoint(e.latlng);
        const b = map.latLngToContainerPoint(L.latLng(firstPoint.lat, firstPoint.lng));
        if (a.distanceTo(b) < 20) {
          onClick('close');
          return;
        }
      }
      onClick('add', e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitBounds({ positions, token }) {
  const map = useMap();
  useEffect(() => {
    if (!positions?.length) return;
    map.fitBounds(positions, { padding: [28, 28], maxZoom: 14 });
  }, [token, map]);
  return null;
}

function Recenter({ lat, lng, skip }) {
  const map = useMap();
  useEffect(() => {
    if (skip || !lat || !lng) return;
    map.setView([lat, lng], 12);
  }, [lat, lng, map, skip]);
  return null;
}

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { message: '' };
  }
  componentDidCatch(err) {
    this.setState({ message: err.message || 'Map load failed' });
  }
  render() {
    if (this.state.message) {
      return <p className="text-xs text-red-600 p-3 bg-red-50 rounded-lg">{this.state.message}</p>;
    }
    return this.props.children;
  }
}

export default function ZoneDrawMap(props) {
  return (
    <MapErrorBoundary>
      <ZoneDrawMapInner {...props} />
    </MapErrorBoundary>
  );
}

function ZoneDrawMapInner({
  mode = 'draw',
  lat, lng, radiusKm = 0,
  polygon = [],
  closed = false,
  city,
  pinAreas = [],
  drawEnabled = true,
  readOnly = false,
  onCenterChange,
  onPolygonChange,
  onClosedChange,
  onOutsideCity,
}) {
  const [satellite, setSatellite] = useState(false);
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [mapError, setMapError] = useState('');
  const center = [city?.lat || lat || 21.1458, city?.lng || lng || 79.0882];
  const points = (polygon || []).map(p => [p.lat, p.lng]);
  const drawing = mode === 'draw';
  const line = !closed && points.length >= 1 ? points : (points.length >= 2 ? [...points, points[0]] : points);
  const pinBounds = pinAreas.flatMap(a => (a.polygon || []).map(p => [p.lat, p.lng]));
  const cityBounds = city ? [
    [city.lat - city.radiusKm / 111, city.lng - city.radiusKm / (111 * Math.cos((city.lat * Math.PI) / 180))],
    [city.lat + city.radiusKm / 111, city.lng + city.radiusKm / (111 * Math.cos((city.lat * Math.PI) / 180))],
  ] : null;
  const fitToken = mode === 'pins'
    ? pinAreas.map(a => a.pin).join(',')
    : (city ? `${city.state}-${city.name}` : '');

  const handleClick = (kind, newLat, newLng) => {
    if (kind === 'close') {
      if ((polygon || []).length >= 3) onClosedChange?.(true);
      return;
    }
    if (closed) return;
    if (city && !isInsideCity(city, newLat, newLng)) {
      setMapError('Zone city ke bahar nahi bana sakte — city boundary ke andar click karo');
      onOutsideCity?.();
      return;
    }
    setMapError('');
    const next = [...(polygon || []), { lat: newLat, lng: newLng }];
    onPolygonChange?.(next);
    if (!(polygon || []).length) onCenterChange?.(newLat, newLng);
  };

  const movePoint = (index, newLat, newLng) => {
    if (city && !isInsideCity(city, newLat, newLng)) {
      setMapError('Point city ke bahar nahi ja sakta');
      onPolygonChange?.([...(polygon || [])]);
      return;
    }
    setMapError('');
    const next = (polygon || []).map((p, i) => (i === index ? { lat: newLat, lng: newLng } : p));
    onPolygonChange?.(next);
  };

  const searchPlace = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const q = city ? `${query}, ${city.name}` : query;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const data = await res.json();
      if (!data[0]) return;
      const la = Number(data[0].lat);
      const ln = Number(data[0].lon);
      if (city && !isInsideCity(city, la, ln)) {
        setMapError('Search result is city ke bahar hai');
        return;
      }
      onCenterChange?.(la, ln);
    } catch { /* ignore */ }
  };

  const hint = !drawing
    ? 'Selected pin codes ke areas map pe highlight hain'
    : !city
      ? 'Pehle city select karo — uske baad city ke andar zone draw hoga'
      : closed
        ? `Zone closed (${points.length} points) — points drag karke adjust karo`
        : points.length === 0
          ? 'City ke andar click karke first point lagao'
          : points.length < 3
            ? `${points.length} points — aur points add karo, last point first (green) se jod ke close karo`
            : `${points.length} points — last point green first point par click karke zone close karo`;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">{hint}</p>
      <div className="relative rounded-xl overflow-hidden border border-gray-200 h-[360px]">
        <MapContainer key={`${mode}-${city?.name || 'none'}`} center={center} zoom={city ? 12 : 13} className="h-full w-full" scrollWheelZoom>
          {satellite ? (
            <TileLayer attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          ) : (
            <TileLayer attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          )}
          {drawing && !readOnly && (
            <ClickDraw
              enabled={drawEnabled && !!city && !closed && !dragging}
              firstPoint={polygon[0]}
              canClose={(polygon || []).length >= 3 && !closed}
              onClick={handleClick}
            />
          )}
          <Recenter lat={city?.lat || lat} lng={city?.lng || lng} skip={points.length > 0 || pinAreas.length > 0} />
          {fitToken && (
            <FitBounds
              token={fitToken}
              positions={pinBounds.length ? pinBounds : cityBounds}
            />
          )}

          {city && (
            <Circle
              center={[city.lat, city.lng]}
              radius={city.radiusKm * 1000}
              pathOptions={{ color: '#1a3a8a', fillColor: '#1a3a8a', fillOpacity: 0.04, weight: 2, dashArray: '8 6' }}
            />
          )}

          {pinAreas.map((a, idx) => {
            const pos = (a.polygon || []).map(p => [p.lat, p.lng]);
            if (pos.length < 3) return null;
            return (
              <Polygon
                key={a.pin || idx}
                positions={pos}
                pathOptions={{ color: '#ef4444', fillColor: '#f87171', fillOpacity: 0.22, weight: 2 }}
              />
            );
          })}

          {drawing && !closed && points.length >= 2 && (
            <Polyline positions={line} pathOptions={{ color: '#ef4444', weight: 3 }} />
          )}
          {drawing && closed && points.length >= 3 && (
            <Polygon positions={points}
              pathOptions={{ color: '#ef4444', fillColor: '#f87171', fillOpacity: 0.28, weight: 3 }} />
          )}
          {drawing && radiusKm > 0 && lat && lng && (
            <Circle center={[lat, lng]} radius={radiusKm * 1000}
              pathOptions={{ color: '#2563eb', fillOpacity: 0.06, weight: 1, dashArray: '4 4' }} />
          )}
          {drawing && points.map((p, i) => (
            <Marker
              key={`${i}-${p[0]}-${p[1]}`}
              position={p}
              icon={vertexIcon(i === 0)}
              draggable={!readOnly}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e.originalEvent);
                  if (readOnly) return;
                  if (i === 0 && (polygon || []).length >= 3 && !closed) onClosedChange?.(true);
                },
                dragstart: () => setDragging(true),
                dragend: (e) => {
                  setDragging(false);
                  const { lat: la, lng: ln } = e.target.getLatLng();
                  movePoint(i, la, ln);
                },
              }}
            />
          ))}
        </MapContainer>

        {!readOnly && !drawEnabled && drawing && (
          <div className="absolute inset-0 z-[350] bg-white/55 flex items-center justify-center text-sm font-semibold text-gray-600 pointer-events-none">
            Pehle city select karo
          </div>
        )}

        <div className="absolute top-3 left-3 z-[400] flex gap-1 bg-white rounded-lg shadow border overflow-hidden text-xs font-semibold">
          <button type="button" onClick={() => setSatellite(false)}
            className={`px-3 py-1.5 ${!satellite ? 'bg-white text-gray-800' : 'text-gray-500'}`}>Map</button>
          <button type="button" onClick={() => setSatellite(true)}
            className={`px-3 py-1.5 ${satellite ? 'bg-gray-800 text-white' : 'text-gray-500'}`}>Satellite</button>
        </div>

        <form onSubmit={searchPlace} className="absolute top-3 left-36 z-[400] flex bg-white rounded-lg shadow border overflow-hidden">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search here"
            className="px-3 py-1.5 text-xs w-40 outline-none" />
          <button type="submit" className="px-2 text-gray-500"><Search size={14} /></button>
        </form>
      </div>
      {drawing && !readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { onClosedChange?.(false); onPolygonChange?.((polygon || []).slice(0, -1)); }}
            className="inline-flex items-center gap-1 text-xs text-gray-600 px-2 py-1 border rounded-lg">
            <Undo2 size={12} /> Undo
          </button>
          <button type="button" onClick={() => { onClosedChange?.(false); onPolygonChange?.([]); }}
            className="inline-flex items-center gap-1 text-xs text-red-500 px-2 py-1 border rounded-lg">
            <Trash2 size={12} /> Clear
          </button>
          <span className={`text-xs ${closed ? 'text-emerald-600 font-semibold' : 'text-amber-600'}`}>
            {closed ? `Closed · ${points.length} points (drag to adjust)` : `${points.length} points · first point par wapas aao to close`}
          </span>
        </div>
      )}
      {mapError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{mapError}</p>}
    </div>
  );
}
