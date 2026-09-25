import { useState, useRef } from 'react';
import { ChevronDown, Search, Check, Plus } from 'lucide-react';
import { capitalizeWords } from '../utils/mediaUtils';
import FloatingDropdown from './FloatingDropdown';

export default function SearchableCreatableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Search or type to add...',
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef(null);

  const normalized = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
  const allOptions = value && !normalized.find(o => o.value === value)
    ? [...normalized, { value, label: value }]
    : normalized;

  const filtered = allOptions.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );
  const trimmed = search.trim();
  const canCreate = trimmed && !allOptions.some(o => o.label.toLowerCase() === trimmed.toLowerCase());
  const selected = allOptions.find(o => o.value === value);

  const pick = (val) => {
    onChange(capitalizeWords(val));
    setOpen(false);
    setSearch('');
  };

  const create = () => {
    if (!trimmed) return;
    pick(trimmed);
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
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none text-left transition
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-primary-300 focus:ring-2 focus:ring-primary-500/30'}
          ${!selected?.label ? 'text-gray-400' : 'text-gray-800'}`}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <FloatingDropdown open={open} onClose={close} triggerRef={triggerRef} maxHeight={320}>
        <div className="p-2.5 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && canCreate) { e.preventDefault(); create(); }
                if (e.key === 'Escape') close();
              }}
              placeholder="Search or type new value..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/30 bg-white"
            />
          </div>
        </div>

        <ul className="flex-1 min-h-0 dropdown-scroll py-1">
          {filtered.map(o => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => pick(o.value)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left transition
                  ${value === o.value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span className="truncate">{o.label}</span>
                {value === o.value && <Check size={14} className="text-primary-600 shrink-0" />}
              </button>
            </li>
          ))}
          {filtered.length === 0 && !canCreate && (
            <li className="px-3 py-4 text-sm text-gray-400 text-center">No results found</li>
          )}
        </ul>

        {canCreate && (
          <button
            type="button"
            onClick={create}
            className="shrink-0 w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary-600 font-medium border-t border-gray-100 bg-primary-50/60 hover:bg-primary-50 transition"
          >
            <Plus size={14} />
            Add &ldquo;{capitalizeWords(trimmed)}&rdquo;
          </button>
        )}
      </FloatingDropdown>
    </div>
  );
}
