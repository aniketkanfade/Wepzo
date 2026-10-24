import { Search, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  LIST_NAVY, LIST_PAGE_BG, LIST_CARD_BORDER, listBtnNavy,
} from '../../../constants/listTheme';
import PaginationControls from './PaginationControls';
import { useAuthStore } from '../../../store/useStore';

export default function AdminListLayout({
  breadcrumb,
  title,
  icon: Icon,
  count = 0,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Ex : search item by name',
  headerActions,
  footerBar,
  filterBar,
  beforeCard,
  children,
  page,
  totalPages,
  total,
  perPage = 25,
  onPageChange,
  onPerPageChange,
  showPagination = true,
  emptyColSpan = 8,
  emptyMessage = 'Koi record nahi mila',
  isEmpty = false,
  pageBackground = LIST_PAGE_BG,
  filterLockKey,
}) {
  const storageKey = `wepzo-list-filter:${filterLockKey || title}`;
  const user = useAuthStore(state => state.user);
  const userStorageKey = `${storageKey}:${user?._id || user?.id || user?.email || 'admin'}`;
  const [filtersLocked, setFiltersLocked] = useState(false);
  const [restoredSearch, setRestoredSearch] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(userStorageKey);
    if (saved === null) return;
    const lockedSearch = JSON.parse(saved);
    if (typeof lockedSearch !== 'string') return;
    setFiltersLocked(true);
    setRestoredSearch(lockedSearch);
    onSearchChange?.(lockedSearch);
  }, [userStorageKey]);

  useEffect(() => {
    if (restoredSearch === null || searchValue !== restoredSearch) return;
    onSearchSubmit?.();
    setRestoredSearch(null);
  }, [restoredSearch, searchValue]);

  const toggleFilterLock = () => {
    if (filtersLocked) {
      localStorage.removeItem(userStorageKey);
      setFiltersLocked(false);
      return;
    }
    localStorage.setItem(userStorageKey, JSON.stringify(searchValue));
    setFiltersLocked(true);
  };

  return (
    <div className="space-y-4 -m-1 p-1 min-h-full" style={{ backgroundColor: pageBackground }}>
      {beforeCard}

      <div
        className="flex flex-col max-h-[calc(100vh-7rem)] rounded-xl border shadow-sm overflow-hidden bg-white"
        style={{ borderColor: LIST_CARD_BORDER }}
      >
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b" style={{ borderColor: LIST_CARD_BORDER }}>
          <div className="flex items-center gap-2.5">
            {Icon && <Icon size={20} style={{ color: LIST_NAVY }} strokeWidth={2.25} />}
            <h1 className="text-lg font-bold tracking-tight" style={{ color: LIST_NAVY }}>{title}</h1>
            <span
              className="text-sm font-medium px-3 py-0.5 rounded-full min-w-[2rem] text-center tabular-nums"
              style={{ backgroundColor: '#e8f1f6', color: LIST_NAVY }}
            >
              {count}
            </span>
          </div>

          {(onSearchChange || onSearchSubmit) && (
            <div className="flex flex-1 max-w-lg mx-auto">
              <input
                value={searchValue}
                onChange={e => onSearchChange?.(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSearchSubmit?.()}
                disabled={filtersLocked}
                placeholder={searchPlaceholder}
                className="flex-1 pl-4 pr-2 py-2.5 border rounded-l-lg text-sm outline-none bg-white text-gray-700"
                style={{ borderColor: '#d4e0e8' }}
              />
              <button type="button" onClick={toggleFilterLock} title={filtersLocked ? 'Unlock saved search filter' : 'Lock current search filter'} aria-label={filtersLocked ? 'Unlock saved search filter' : 'Lock current search filter'}
                className={`grid w-10 place-items-center border-y border-r ${filtersLocked ? 'bg-blue-50 text-blue-800' : 'bg-white text-slate-500 hover:bg-slate-50'}`} style={{ borderColor: '#d4e0e8' }}>
                {filtersLocked ? <LockKeyhole size={16}/> : <LockKeyholeOpen size={16}/>}
              </button>
              <button type="button" onClick={onSearchSubmit}
                className={`px-4 rounded-r-lg transition ${filtersLocked ? 'rounded-l-none' : ''} ${listBtnNavy}`}>
                <Search size={17} />
              </button>
            </div>
          )}

          {headerActions && (
            <div className="flex items-center gap-2 flex-wrap">{headerActions}</div>
          )}
        </div>

        {footerBar && (
          <div className="shrink-0 flex justify-end px-6 py-3 border-b" style={{ borderColor: LIST_CARD_BORDER, backgroundColor: '#fafbfd' }}>
            {footerBar}
          </div>
        )}

        {filterBar}

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto dropdown-scroll">
          {isEmpty ? (
            <div className="px-5 py-20 text-center text-gray-400">{emptyMessage}</div>
          ) : (
            <>
              {children}
            </>
          )}
        </div>
        {showPagination && onPageChange && !isEmpty && <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          perPage={perPage}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
        />}
      </div>
    </div>
  );
}
