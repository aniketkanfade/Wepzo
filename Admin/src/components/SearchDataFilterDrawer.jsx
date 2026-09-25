import { useEffect } from 'react';
import { X } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

function FilterField({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

export default function SearchDataFilterDrawer({
  open,
  onClose,
  draft,
  onChange,
  onApply,
  onReset,
  stores = [],
  zones = [],
  categories = [],
  subCategories = [],
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const subOptions = subCategories
    .filter(s => !draft.category || s.mainCategory === draft.category)
    .map(s => s.name);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close filter" />
      <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Search data</h2>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto dropdown-scroll px-5 py-5 space-y-5">
          <FilterField
            label="Store"
            value={draft.storeId || draft.store || ''}
            onChange={v => onChange('storeId', v)}
            placeholder="All stores"
            options={stores}
          />
          <FilterField
            label="Zone"
            value={draft.zone}
            onChange={v => onChange('zone', v)}
            placeholder="All Zones"
            options={zones}
          />
          <FilterField
            label="Category"
            value={draft.category}
            onChange={v => onChange('category', v)}
            placeholder="All category"
            options={categories}
          />
          <FilterField
            label="Sub Category"
            value={draft.subCategory}
            onChange={v => onChange('subCategory', v)}
            placeholder="All sub category"
            options={subOptions}
            disabled={!draft.category && subOptions.length === 0}
          />
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-white">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
          >
            Filter
          </button>
        </div>
      </div>
    </div>
  );
}
