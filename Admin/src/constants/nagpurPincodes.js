/** Nagpur pin codes with area names + map center */
export const NAGPUR_PINCODES = [
  { pin: '440001', area: 'Sitabuldi', lat: 21.1458, lng: 79.0882 },
  { pin: '440002', area: 'Mahal', lat: 21.1496, lng: 79.1112 },
  { pin: '440003', area: 'Itwari', lat: 21.1554, lng: 79.1086 },
  { pin: '440004', area: 'Dhantoli', lat: 21.1392, lng: 79.0821 },
  { pin: '440005', area: 'Reshimbagh', lat: 21.1408, lng: 79.1184 },
  { pin: '440006', area: 'Seminary Hills', lat: 21.1642, lng: 79.0558 },
  { pin: '440007', area: 'Sadar', lat: 21.1618, lng: 79.0804 },
  { pin: '440008', area: 'Ravi Nagar', lat: 21.1546, lng: 79.0622 },
  { pin: '440010', area: 'Civil Lines', lat: 21.1520, lng: 79.0894 },
  { pin: '440012', area: 'Dharampeth', lat: 21.1389, lng: 79.0654 },
  { pin: '440013', area: 'Ramdaspeth', lat: 21.1354, lng: 79.0788 },
  { pin: '440014', area: 'Nandanvan', lat: 21.1328, lng: 79.1221 },
  { pin: '440015', area: 'Ajni / Wardha Road', lat: 21.1245, lng: 79.0521 },
  { pin: '440016', area: 'Manewada', lat: 21.1098, lng: 79.0824 },
  { pin: '440017', area: 'Hingna Road', lat: 21.1087, lng: 79.0012 },
  { pin: '440018', area: 'Koradi', lat: 21.2472, lng: 79.0986 },
  { pin: '440022', area: 'Pratap Nagar', lat: 21.1186, lng: 79.0688 },
  { pin: '440024', area: 'Jaripatka', lat: 21.1764, lng: 79.1022 },
  { pin: '440025', area: 'Hingna MIDC', lat: 21.1012, lng: 78.9824 },
  { pin: '440026', area: 'Kamptee', lat: 21.2234, lng: 79.1978 },
  { pin: '440027', area: 'Besa', lat: 21.0864, lng: 79.0782 },
  { pin: '440032', area: 'Wadi', lat: 21.1548, lng: 78.9964 },
  { pin: '440033', area: 'Khamla', lat: 21.1124, lng: 79.0486 },
  { pin: '440034', area: 'Manish Nagar', lat: 21.1042, lng: 79.0628 },
  { pin: '440035', area: 'Beltarodi', lat: 21.0926, lng: 79.0924 },
  { pin: '440036', area: 'Hudkeshwar', lat: 21.0968, lng: 79.1286 },
  { pin: '440037', area: 'Somalwada', lat: 21.1188, lng: 79.0422 },
  { pin: '441108', area: 'Butibori', lat: 20.9286, lng: 79.0008 },
  { pin: '441110', area: 'Kalmeshwar', lat: 21.2324, lng: 78.9112 },
  { pin: '441111', area: 'Katol', lat: 21.2736, lng: 78.5884 },
  { pin: '441122', area: 'Umred', lat: 20.8542, lng: 79.3246 },
  { pin: '441401', area: 'Saoner', lat: 21.3856, lng: 78.9208 },
];

export function hexPolygon(lat, lng, km = 2.2) {
  const dLat = km / 111;
  const dLng = km / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 180) * (i * 45);
    pts.push({
      lat: Number((lat + dLat * Math.cos(a)).toFixed(5)),
      lng: Number((lng + dLng * Math.sin(a)).toFixed(5)),
    });
  }
  return pts;
}

export function pincodeLabel(p) {
  return `${p.pin} — ${p.area}`;
}

export async function fetchPincodePolygon(entry) {
  const fallback = hexPolygon(entry.lat, entry.lng, 2.2);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&postalcode=${entry.pin}&polygon_geojson=1&limit=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    const geo = data[0]?.geojson;
    let ring = null;
    if (geo?.type === 'Polygon') ring = geo.coordinates?.[0];
    if (geo?.type === 'MultiPolygon') ring = geo.coordinates?.[0]?.[0];
    if (Array.isArray(ring) && ring.length >= 3) {
      const poly = ring.map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) })).filter(p => Number.isFinite(p.lat));
      if (poly.length >= 3) return { polygon: poly, lat: Number(data[0].lat) || entry.lat, lng: Number(data[0].lon) || entry.lng };
    }
    if (data[0]?.lat) {
      return {
        polygon: hexPolygon(Number(data[0].lat), Number(data[0].lon), 2.2),
        lat: Number(data[0].lat),
        lng: Number(data[0].lon),
      };
    }
  } catch { /* offline / CORS — local area */ }
  return { polygon: fallback, lat: entry.lat, lng: entry.lng };
}
