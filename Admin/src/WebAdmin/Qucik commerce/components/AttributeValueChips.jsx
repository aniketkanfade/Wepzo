import { useState, useEffect, useRef } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { capitalizeWords } from '../../../utils/mediaUtils';
import { isColorAttribute, getColorHex, isLightColor, hashColor } from '../../../utils/colorMap';

function ColorChip({ opt, active, onClick }) {
  const hex = getColorHex(opt) || hashColor(opt);
  const light = hex.startsWith('#') ? isLightColor(hex) : false;
  const borderColor = active ? '#2563EB' : (light ? '#D1D5DB' : 'rgba(255,255,255,0.3)');

  return (
    <button
      type="button"
      onClick={onClick}
      title={opt}
      className={`group flex flex-col items-center gap-1 p-1 rounded-xl transition-all duration-150
        ${active ? 'ring-2 ring-primary-600 ring-offset-1 scale-105' : 'hover:scale-105 hover:ring-1 hover:ring-gray-300 hover:ring-offset-1'}`}
    >
      <span className="relative">
        <span
          className="block w-9 h-9 rounded-full border-2 shadow-sm transition"
          style={{ backgroundColor: hex, borderColor }}
        />
        {active && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center ${light ? 'bg-gray-800/70' : 'bg-white/30'}`}>
              <Check size={10} className="text-white" strokeWidth={3} />
            </span>
          </span>
        )}
      </span>
      <span className="text-[9px] font-semibold text-gray-600 capitalize max-w-[44px] truncate">{opt}</span>
    </button>
  );
}

export default function AttributeValueChips({ label, options = [], selected = [], onChange, allowCustom = true }) {
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [customVal, setCustomVal] = useState('');
  const inputRef = useRef(null);
  const colorMode = isColorAttribute(label);

  const displayOptions = [...new Set([...options, ...selected])];

  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };

  const addCustom = () => {
    const val = capitalizeWords(customVal.trim());
    if (!val) return;
    if (!selected.includes(val)) onChange([...selected, val]);
    setCustomVal('');
    setShowAddPopup(false);
  };

  const openPopup = () => {
    setCustomVal('');
    setShowAddPopup(true);
  };

  const closePopup = () => {
    setShowAddPopup(false);
    setCustomVal('');
  };

  useEffect(() => {
    if (showAddPopup) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [showAddPopup]);

  useEffect(() => {
    if (!showAddPopup) return;
    const onKey = (e) => { if (e.key === 'Escape') closePopup(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showAddPopup]);

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-800 capitalize">{label}</p>
            {colorMode && (
              <span className="text-[9px] font-medium text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-full">Colors</span>
            )}
          </div>
          <span className="text-[10px] font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
            {selected.length} selected
          </span>
        </div>

        <div className="px-3 py-2.5">
          <div className={`flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto dropdown-scroll ${colorMode ? 'gap-2' : ''}`}>
            {displayOptions.map(opt => {
              const active = selected.includes(opt);
              if (colorMode) {
                return <ColorChip key={opt} opt={opt} active={active} onClick={() => toggle(opt)} />;
              }
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all duration-150
                    ${active
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                    }`}
                >
                  {opt}
                </button>
              );
            })}

            {allowCustom && (
              <button
                type="button"
                onClick={openPopup}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-dashed transition
                  ${colorMode
                    ? 'border-primary-300 text-primary-600 hover:bg-primary-50 py-4'
                    : 'border-primary-300 text-primary-600 hover:bg-primary-50'
                  }`}
              >
                <Plus size={12} /> Add
              </button>
            )}

            {displayOptions.length === 0 && !allowCustom && (
              <p className="text-[10px] text-gray-400 py-1">No values available</p>
            )}
          </div>
        </div>
      </div>

      {showAddPopup && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/15" onClick={closePopup} />
          <div className="relative w-full max-w-[280px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50/80">
              <p className="text-sm font-semibold text-gray-800 capitalize">Add {label}</p>
              <button type="button" onClick={closePopup} className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-3 space-y-3">
              <input
                ref={inputRef}
                value={customVal}
                onChange={e => setCustomVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
                }}
                placeholder={colorMode ? 'e.g. Maroon, Teal...' : `Type ${label} value...`}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              <div className="flex gap-2">
                <button type="button" onClick={closePopup}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="button" onClick={addCustom} disabled={!customVal.trim()}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
