import { hexPolygon } from './nagpurPincodes';

export const STATES = ['Maharashtra', 'Delhi', 'Karnataka', 'Gujarat'];

export const CITIES = [
  { state: 'Maharashtra', name: 'Nagpur', lat: 21.1458, lng: 79.0882, radiusKm: 18 },
  { state: 'Maharashtra', name: 'Pune', lat: 18.5204, lng: 73.8567, radiusKm: 20 },
  { state: 'Maharashtra', name: 'Mumbai', lat: 19.076, lng: 72.8777, radiusKm: 22 },
  { state: 'Maharashtra', name: 'Nashik', lat: 19.9975, lng: 73.7898, radiusKm: 14 },
  { state: 'Delhi', name: 'New Delhi', lat: 28.6139, lng: 77.209, radiusKm: 18 },
  { state: 'Karnataka', name: 'Bengaluru', lat: 12.9716, lng: 77.5946, radiusKm: 20 },
  { state: 'Gujarat', name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, radiusKm: 18 },
];

export const PINCODES = [
  { state: 'Maharashtra', city: 'Nagpur', pin: '440001', area: 'Sitabuldi', lat: 21.1458, lng: 79.0882 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440002', area: 'Mahal', lat: 21.1496, lng: 79.1112 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440003', area: 'Itwari', lat: 21.1554, lng: 79.1086 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440004', area: 'Dhantoli', lat: 21.1392, lng: 79.0821 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440005', area: 'Reshimbagh', lat: 21.1408, lng: 79.1184 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440006', area: 'Seminary Hills', lat: 21.1642, lng: 79.0558 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440007', area: 'Sadar', lat: 21.1618, lng: 79.0804 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440008', area: 'Ravi Nagar', lat: 21.1546, lng: 79.0622 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440010', area: 'Civil Lines', lat: 21.152, lng: 79.0894 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440012', area: 'Dharampeth', lat: 21.1389, lng: 79.0654 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440013', area: 'Ramdaspeth', lat: 21.1354, lng: 79.0788 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440014', area: 'Nandanvan', lat: 21.1328, lng: 79.1221 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440015', area: 'Ajni / Wardha Road', lat: 21.1245, lng: 79.0521 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440016', area: 'Manewada', lat: 21.1098, lng: 79.0824 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440017', area: 'Hingna Road', lat: 21.1087, lng: 79.0012 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440018', area: 'Koradi', lat: 21.2472, lng: 79.0986 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440022', area: 'Pratap Nagar', lat: 21.1186, lng: 79.0688 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440024', area: 'Jaripatka', lat: 21.1764, lng: 79.1022 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440025', area: 'Hingna MIDC', lat: 21.1012, lng: 78.9824 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440026', area: 'Kamptee', lat: 21.2234, lng: 79.1978 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440027', area: 'Besa', lat: 21.0864, lng: 79.0782 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440032', area: 'Wadi', lat: 21.1548, lng: 78.9964 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440033', area: 'Khamla', lat: 21.1124, lng: 79.0486 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440034', area: 'Manish Nagar', lat: 21.1042, lng: 79.0628 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440035', area: 'Beltarodi', lat: 21.0926, lng: 79.0924 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440036', area: 'Hudkeshwar', lat: 21.0968, lng: 79.1286 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '440037', area: 'Somalwada', lat: 21.1188, lng: 79.0422 },
  { state: 'Maharashtra', city: 'Nagpur', pin: '441108', area: 'Butibori', lat: 20.9286, lng: 79.0008 },
  { state: 'Maharashtra', city: 'Pune', pin: '411001', area: 'Pune Camp', lat: 18.5126, lng: 73.8786 },
  { state: 'Maharashtra', city: 'Pune', pin: '411004', area: 'Deccan Gymkhana', lat: 18.516, lng: 73.841 },
  { state: 'Maharashtra', city: 'Pune', pin: '411005', area: 'Shivajinagar', lat: 18.5308, lng: 73.8474 },
  { state: 'Maharashtra', city: 'Pune', pin: '411014', area: 'Hadapsar', lat: 18.5089, lng: 73.926 },
  { state: 'Maharashtra', city: 'Pune', pin: '411027', area: 'Aundh', lat: 18.558, lng: 73.807 },
  { state: 'Maharashtra', city: 'Mumbai', pin: '400001', area: 'Fort', lat: 18.934, lng: 72.835 },
  { state: 'Maharashtra', city: 'Mumbai', pin: '400050', area: 'Bandra West', lat: 19.0596, lng: 72.8295 },
  { state: 'Maharashtra', city: 'Mumbai', pin: '400070', area: 'Kurla', lat: 19.0728, lng: 72.8826 },
  { state: 'Maharashtra', city: 'Mumbai', pin: '400092', area: 'Borivali West', lat: 19.2307, lng: 72.8567 },
  { state: 'Maharashtra', city: 'Nashik', pin: '422001', area: 'Nashik City', lat: 19.9975, lng: 73.7898 },
  { state: 'Maharashtra', city: 'Nashik', pin: '422009', area: 'CIDCO Nashik', lat: 19.9732, lng: 73.7584 },
  { state: 'Delhi', city: 'New Delhi', pin: '110001', area: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
  { state: 'Delhi', city: 'New Delhi', pin: '110017', area: 'Malviya Nagar', lat: 28.5335, lng: 77.2109 },
  { state: 'Karnataka', city: 'Bengaluru', pin: '560001', area: 'Bengaluru GPO', lat: 12.9767, lng: 77.5993 },
  { state: 'Karnataka', city: 'Bengaluru', pin: '560038', area: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { state: 'Gujarat', city: 'Ahmedabad', pin: '380001', area: 'Lal Darwaza', lat: 23.0236, lng: 72.588 },
  { state: 'Gujarat', city: 'Ahmedabad', pin: '380015', area: 'Satellite', lat: 23.0258, lng: 72.5085 },
];

export function citiesInState(state) {
  return CITIES.filter(c => c.state === state);
}

export function pinsInCity(state, city) {
  return PINCODES.filter(p => p.state === state && p.city === city);
}

export function getCity(state, city) {
  if (!city) return null;
  return CITIES.find(c => c.name === city && (!state || c.state === state))
    || CITIES.find(c => c.name === city)
    || null;
}

export function cityPolygon(city) {
  if (!city) return [];
  return hexPolygon(city.lat, city.lng, city.radiusKm);
}

function toRad(d) { return (d * Math.PI) / 180; }

export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsideCity(city, lat, lng) {
  if (!city || lat == null || lng == null) return false;
  return distanceKm(city.lat, city.lng, lat, lng) <= city.radiusKm;
}

export function pincodeLabel(p) {
  return `${p.pin} — ${p.area}`;
}

export function findPin(pin) {
  return PINCODES.find(p => p.pin === pin) || null;
}
