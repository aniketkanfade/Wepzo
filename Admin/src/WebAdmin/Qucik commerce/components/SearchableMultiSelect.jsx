import { useState, useRef } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import FloatingDropdown from './FloatingDropdown';

export default function SearchableMultiSelect({
  values = [],
  onChange,
  options = [],
  placeholder = 'Select options',
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef(null);

  const normalized = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  const filtered = normalized.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val) => {
    if (values.includes(val)) onChange(values.filter(v => v !== val));
    else onChange([...values, val]);
  };

  const remove = (val) => onChange(values.filter(v => v !== val));

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
        className={`w-full min-h-[42px] flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none text-left
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-gray-300 focus:ring-2 focus:ring-primary-500'}`}
      >
        <div className="flex flex-wrap gap-1.5 flex-1">
          {values.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            values.map(v => (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded-md text-xs font-medium capitalize">
                {v}
                <button type="button" onClick={e => { e.stopPropagation(); remove(v); }} className="hover:text-primary-900">
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>
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
              placeholder="Search attributes..."
              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        </div>
        <ul className="flex-1 min-h-0 dropdown-scroll py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-sm text-gray-400 text-center">No results found</li>
          ) : (
            filtered.map(o => {
              const checked = values.includes(o.value);
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-primary-50 transition capitalize
                      ${checked ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0
                      ${checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                      {checked && <Check size={10} className="text-white" />}
                    </span>
                    {o.label}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </FloatingDropdown>
    </div>
  );
}
