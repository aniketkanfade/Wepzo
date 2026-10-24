import { Edit, Trash2, Search, ChevronDown, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  LIST_NAVY, LIST_CARD_BORDER, listBtnOutline,
  listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass,
} from '../../../constants/listTheme';
import PaginationControls from './PaginationControls';
import { useAuthStore } from '../../../store/useStore';
import { useBulkSelection } from '../../../hooks/useBulkSelection';

export default function SimpleListTable({
  title, count, search, setSearch, setPage, searchPlaceholder, onExport, onBulkDelete,
  paginated, page, perPage, setPerPage, filtered, totalPages, idKey, onEdit, onDelete, extraColumns = [],
  embedded = false,
}) {
  const user = useAuthStore(state => state.user);
  const storageKey = `wepzo-list-filter:${title}:${user?._id || user?.id || user?.email || 'admin'}`;
  const [filtersLocked, setFiltersLocked] = useState(false);
  const selection = useBulkSelection(filtered || []);
  const colCount = 5 + extraColumns.length;
  const outerClass = embedded
    ? 'flex flex-col min-h-0'
    : 'flex flex-col max-h-[calc(100vh-7rem)] rounded-xl border shadow-sm overflow-hidden bg-white';

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return;
    const lockedSearch = JSON.parse(saved);
    if (typeof lockedSearch !== 'string') return;
    setFiltersLocked(true);
    setSearch(lockedSearch);
    setPage(1);
  }, [storageKey]);

  const toggleFilterLock = () => {
    if (filtersLocked) {
      localStorage.removeItem(storageKey);
      setFiltersLocked(false);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(search));
    setFiltersLocked(true);
  };

  return (
    <div className={outerClass} style={embedded ? undefined : { borderColor: LIST_CARD_BORDER }}>
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b bg-white" style={{ borderColor: LIST_CARD_BORDER }}>
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold tracking-tight" style={{ color: LIST_NAVY }}>{title}</h2>
          <span
            className="text-sm font-medium px-3 py-0.5 rounded-full min-w-[2rem] text-center tabular-nums"
            style={{ backgroundColor: '#eef2f8', color: LIST_NAVY }}
          >
            {filtered?.length ?? count}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              disabled={filtersLocked}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={searchPlaceholder}
              className="pl-8 pr-3 py-2.5 border rounded-l-lg text-sm w-48 outline-none bg-white disabled:bg-slate-50"
              style={{ borderColor: '#e0e4ec' }}
            />
          </div>
          <button type="button" onClick={toggleFilterLock} title={filtersLocked ? 'Unlock saved search filter' : 'Lock current search filter'} aria-label={filtersLocked ? 'Unlock saved search filter' : 'Lock current search filter'}
            className={`grid h-10 w-9 place-items-center rounded-lg border ${filtersLocked ? 'bg-blue-50 text-blue-800' : 'bg-white text-slate-500 hover:bg-slate-50'}`} style={{ borderColor: '#e0e4ec' }}>
            {filtersLocked ? <LockKeyhole size={15}/> : <LockKeyholeOpen size={15}/>}
          </button>
          {onExport && (
            <button type="button" onClick={onExport}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${listBtnOutline}`}>
              Export <ChevronDown size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto dropdown-scroll">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className={listTheadClass} style={listTheadStyle}>
              <th className={`${listThClass} w-10`}>
                <input type="checkbox" checked={selection.allSelected} onChange={selection.toggleAll}
                  aria-label={`Select all ${filtered?.length || 0} filtered ${title.toLowerCase()}`} />
              </th>
              <th className={`${listThClass} w-12`}>#</th>
              <th className={listThClass}>ID</th>
              {extraColumns.map(col => (
                <th key={col.key} className={listThClass}>{col.label}</th>
              ))}
              <th className={listThClass}>Name</th>
              <th className={listThClass}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, i) => (
              <tr key={item._id} className={listRowClass} style={listRowStyle}>
                <td className={listTdClass}>
                  <input type="checkbox" checked={selection.selectedIds.has(String(item._id))}
                    onChange={() => selection.toggle(item._id)} aria-label={`Select ${item.name}`} />
                </td>
                <td className={`${listTdClass} text-gray-500 tabular-nums`}>{(page - 1) * perPage + i + 1}</td>
                <td className={`${listTdClass} text-gray-600`}>{item[idKey]}</td>
                {extraColumns.map(col => (
                  <td key={col.key} className={listTdClass}>
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
                <td className={`${listTdClass} font-medium text-gray-800`}>{item.name}</td>
                <td className={listTdClass}>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => onEdit(item)} className="p-1.5 text-[#1a3a8a] hover:bg-[#eef2f8] rounded-lg">
                      <Edit size={16} />
                    </button>
                    <button type="button" onClick={() => onDelete(item._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-6 py-20 text-center text-gray-400">No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={filtered?.length ?? 0}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
        selection={onBulkDelete ? {
          allSelected: selection.allSelected,
          selectedCount: selection.selectedItems.length,
          onToggleAll: selection.toggleAll,
          onBulkDelete: () => onBulkDelete(selection.selectedItems),
        } : undefined}
      />
    </div>
  );
}
