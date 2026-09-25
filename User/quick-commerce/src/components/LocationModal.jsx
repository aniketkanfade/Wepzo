import { useMemo, useState } from 'react';
import { Briefcase, Crosshair, Home, MapPin, Plus, Search, X } from 'lucide-react';
import { CITIES, cityForPoint, distanceM, formatDistance, isInsideCity, reverseGeocode, searchPlaces } from '../constants/geo';
import { useLocationStore } from '../store/location';
import LocationMap from './LocationMap';

const ICONS = {
  home: Home,
  work: Briefcase,
  other: MapPin,
};

export default function LocationModal({ onClose }) {
  const { current, saved, gps, setCurrent, setGps, addSaved } = useLocationStore();
  const [mode, setMode] = useState('list');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('Home');
  const [cityName, setCityName] = useState(current?.city || 'Nagpur');
  const [pin, setPin] = useState({ lat: current?.lat, lng: current?.lng, line: current?.line || '', area: current?.area || '', pin: current?.pin || '' });

  const city = useMemo(() => CITIES.find(c => c.name === cityName) || CITIES[0], [cityName]);

  const applyLoc = (loc) => {
    setCurrent(loc);
    onClose();
  };

  const fromCoords = async (lat, lng, extra = {}) => {
    const inside = cityForPoint(lat, lng);
    if (!inside) {
      setErr(`Location ${city.name} city ke bahar hai. City ke andar select karo.`);
      return null;
    }
    const geo = await reverseGeocode(lat, lng);
    return {
      lat, lng,
      city: inside.name,
      area: geo.area || extra.area || inside.name,
      pin: geo.pin || extra.pin || '',
      line: geo.line,
      ...extra,
    };
  };

  const useGps = () => {
    setErr('');
    if (!navigator.geolocation) {
      setErr('Browser location support nahi karta');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGps({ lat, lng });
        const loc = await fromCoords(lat, lng, { id: 'gps', label: 'Current', icon: 'other' });
        if (loc) applyLoc(loc);
      } catch {
        setErr('Address nahi mil paya');
      } finally {
        setBusy(false);
      }
    }, () => {
      setBusy(false);
      setErr('Location permission deny hui');
    }, { enableHighAccuracy: true, timeout: 12000 });
  };

  const runSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const list = (await searchPlaces(query.trim(), city)).filter(h => isInsideCity(city, h.lat, h.lng));
      setHits(list);
      if (!list.length) setErr('Is city ke andar koi result nahi');
    } catch {
      setErr('Search fail hui');
    } finally {
      setBusy(false);
    }
  };

  const pickSearch = async (h) => {
    const loc = await fromCoords(h.lat, h.lng, { label: 'Other', icon: 'other' });
    if (loc) applyLoc(loc);
  };

  const saveNew = async () => {
    if (!pin.lat || !pin.lng) {
      setErr('Map pe location select karo');
      return;
    }
    if (!isInsideCity(city, pin.lat, pin.lng)) {
      setErr('Pin city ke bahar hai');
      return;
    }
    setBusy(true);
    try {
      const loc = await fromCoords(pin.lat, pin.lng, {
        label,
        icon: label === 'Home' ? 'home' : label === 'Work' ? 'work' : 'other',
      });
      if (loc) addSaved(loc);
      onClose();
    } catch {
      setErr('Save fail');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[88vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-lg">{mode === 'add' ? 'Add New Address' : 'Your Location'}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        {mode === 'list' && (
          <div className="p-4 space-y-3">
            <form onSubmit={runSearch} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-fuchsia-50/80 border border-fuchsia-100">
              <Search size={16} className="text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search a new address" className="flex-1 bg-transparent text-sm outline-none" />
            </form>
            {hits.length > 0 && (
              <ul className="border rounded-xl divide-y text-sm">
                {hits.map((h, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => pickSearch(h)} className="w-full text-left px-3 py-2 hover:bg-slate-50">
                      {h.line}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={useGps} disabled={busy}
              className="w-full flex items-center gap-2 px-3 py-3 rounded-xl border text-pink-600 font-semibold text-sm hover:bg-pink-50">
              <Crosshair size={16} /> Use My Current Location
            </button>
            <button type="button" onClick={() => { setMode('add'); setErr(''); }}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl border text-pink-600 font-semibold text-sm hover:bg-pink-50">
              <span className="inline-flex items-center gap-2"><Plus size={16} /> Add New Address</span>
              <span className="text-slate-300">›</span>
            </button>

            <p className="text-xs font-bold text-slate-500 pt-2">Saved Addresses</p>
            <div className="space-y-2">
              {saved.map(s => {
                const Icon = ICONS[s.icon] || MapPin;
                const m = gps ? distanceM(gps.lat, gps.lng, s.lat, s.lng) : null;
                const active = current?.id === s.id;
                return (
                  <button key={s.id} type="button" onClick={() => applyLoc(s)}
                    className={`w-full text-left flex gap-3 px-3 py-3 rounded-2xl border ${active ? 'border-pink-400 bg-pink-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <Icon size={18} className="text-slate-500 mt-0.5 shrink-0" />
                    <span>
                      <span className="font-semibold text-sm">{s.label}{m != null ? <span className="text-slate-400 font-normal"> · {formatDistance(m)}</span> : null}</span>
                      <span className="block text-xs text-slate-500 line-clamp-2 mt-0.5">{s.line}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {err && <p className="text-xs text-rose-600">{err}</p>}
            {busy && <p className="text-xs text-slate-400">Please wait…</p>}
          </div>
        )}

        {mode === 'add' && (
          <div className="p-4 space-y-3">
            <label className="text-xs font-semibold text-slate-500 block">City
              <select value={cityName} onChange={e => setCityName(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg text-sm">
                {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              {['Home', 'Work', 'Other'].map(l => (
                <button key={l} type="button" onClick={() => setLabel(l)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${label === l ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-slate-600'}`}>
                  {l}
                </button>
              ))}
            </div>
            <LocationMap
              city={city}
              lat={pin.lat}
              lng={pin.lng}
              error={err}
              onPick={(pt, message) => {
                if (!pt) { setErr(message || ''); return; }
                setErr('');
                setPin(p => ({ ...p, lat: pt.lat, lng: pt.lng }));
                reverseGeocode(pt.lat, pt.lng).then(g => setPin({ lat: pt.lat, lng: pt.lng, line: g.line, area: g.area, pin: g.pin }));
              }}
            />
            {pin.line && <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">{pin.line}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setMode('list')} className="px-4 py-2 text-sm rounded-lg border">Back</button>
              <button type="button" onClick={saveNew} disabled={busy}
                className="px-4 py-2 text-sm rounded-lg bg-pink-600 text-white font-semibold disabled:opacity-50">Save location</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
