import { useState, useRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import FloatingDropdown from './FloatingDropdown';

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select',
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef(null);

  const normalized = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  const selected = normalized.find(o => o.value === value);
  const filtered = normalized.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const pick = (val) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none text-left
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-gray-300 focus:ring-2 focus:ring-primary-500'}
          ${!selected?.label ? 'text-gray-400' : 'text-gray-800'}`}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`text-gray-400 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      <FloatingDropdown open={open} onClose={close} triggerRef={triggerRef} maxHeight={300}>
        <div className="p-2 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') close(); }}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        </div>
        <ul className="flex-1 min-h-0 dropdown-scroll py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-sm text-gray-400 text-center">No results found</li>
          ) : (
            filtered.map(o => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => pick(o.value)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left hover:bg-primary-50 transition
                    ${value === o.value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
                >
                  <span className="truncate">{o.label}</span>
                  {value === o.value && <Check size={14} className="text-primary-600 shrink-0" />}
                </button>
              </li>
            ))
          )}
        </ul>
      </FloatingDropdown>
    </div>
  );
}
