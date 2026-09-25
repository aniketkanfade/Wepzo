const COLOR_MAP = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  black: '#1F2937',
  white: '#F9FAFB',
  yellow: '#EAB308',
  pink: '#EC4899',
  grey: '#9CA3AF',
  gray: '#9CA3AF',
  brown: '#92400E',
  navy: '#1E3A5F',
  maroon: '#7F1D1D',
  beige: '#D4B896',
  orange: '#F97316',
  purple: '#A855F7',
  violet: '#8B5CF6',
  indigo: '#6366F1',
  cyan: '#06B6D4',
  teal: '#14B8A6',
  lime: '#84CC16',
  gold: '#CA8A04',
  silver: '#C0C0C0',
  cream: '#FFFDD0',
  mustard: '#E2B93B',
  olive: '#808000',
  coral: '#FF7F50',
  peach: '#FFCBA4',
  turquoise: '#40E0D0',
  magenta: '#D946EF',
  wine: '#722F37',
  charcoal: '#36454F',
  ivory: '#FFFFF0',
  khaki: '#C3B091',
  lavender: '#E6E6FA',
  mint: '#98FF98',
  rust: '#B7410E',
  sky: '#87CEEB',
  tan: '#D2B48C',
};

export function isColorAttribute(label) {
  const l = (label || '').toLowerCase().trim();
  return l === 'color' || l === 'colour' || l === 'colors';
}

export function getColorHex(name) {
  if (!name) return null;
  const key = name.toLowerCase().trim().replace(/\s+/g, '_');
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  const first = key.split(/[\s/_-]/)[0];
  return COLOR_MAP[first] || null;
}

export function isLightColor(hex) {
  if (!hex || hex.length < 7) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

export function hashColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 50%)`;
}
