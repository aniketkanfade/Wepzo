import { Ruler } from 'lucide-react';
import { isColorAttribute, getColorHex, hashColor } from '../utils/colorMap';

export function buildVariantSpecs(variant, baseSpecs = {}) {
  const fromAttrs = Object.fromEntries(Object.entries(variant?.attributes || {}));
  const attrKeys = new Set(Object.keys(fromAttrs).map(k => k.toLowerCase()));
  const extra = Object.fromEntries(
    Object.entries(variant?.specifications || {}).filter(([k]) => !attrKeys.has(k.toLowerCase()))
  );
  return { ...fromAttrs, ...extra };
}

export default function VariantSpecPanel({ variant, baseSpecs = {}, title = 'Variant Specifications', compact = false }) {
  if (!variant) return null;

  const specs = buildVariantSpecs(variant, baseSpecs);
  const entries = Object.entries(specs).filter(([, v]) => v);

  if (entries.length === 0) return null;

  const label = Object.values(variant.attributes || {}).join(' / ');

  if (compact) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 rounded-lg">
            {isColorAttribute(k) && (
              <span className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
                style={{ backgroundColor: getColorHex(v) || hashColor(v) }} />
            )}
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 capitalize truncate">{k}</p>
              <p className="text-xs font-semibold text-gray-800 capitalize truncate">{v}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-100 flex items-center gap-2">
        <Ruler size={16} className="text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {label && <p className="text-xs text-gray-500 capitalize">{label}</p>}
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
            {isColorAttribute(k) ? (
              <span className="w-8 h-8 rounded-full border-2 border-gray-200 shrink-0 shadow-inner"
                style={{ backgroundColor: getColorHex(v) || hashColor(v) }} />
            ) : (
              <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0 capitalize">
                {k.charAt(0)}
              </span>
            )}
            <div>
              <p className="text-xs text-gray-400 capitalize">{k}</p>
              <p className="text-sm font-semibold text-gray-800 capitalize">{v}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
