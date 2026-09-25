import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  LIST_NAVY, LIST_PAGE_BG, LIST_CARD_BORDER, listBtnNavy, listBtnOutline,
} from '../constants/listTheme';

function Pagination({ page, totalPages, total, perPage, onPageChange }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div
      className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t bg-white"
      style={{ borderColor: LIST_CARD_BORDER }}
    >
      <p className="text-sm text-gray-500">
        Showing {total ? (page - 1) * perPage + 1 : 0} to {Math.min(page * perPage, total)} of {total} entries
      </p>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}
          className={`p-2 rounded-lg disabled:opacity-40 transition ${listBtnOutline}`}>
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) => typeof p === 'string' ? (
          <span key={`gap-${i}`} className="w-8 text-center text-gray-400 text-sm">…</span>
        ) : (
          <button key={p} type="button" onClick={() => onPageChange(p)}
            className={`min-w-9 h-9 px-1 rounded-lg text-sm font-medium transition ${page === p ? listBtnNavy : listBtnOutline}`}>
            {p}
          </button>
        ))}
        <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className={`p-2 rounded-lg disabled:opacity-40 transition ${listBtnOutline}`}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

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
  showPagination = true,
  emptyColSpan = 8,
  emptyMessage = 'Koi record nahi mila',
  isEmpty = false,
}) {
  return (
    <div className="space-y-4 -m-1 p-1 min-h-full" style={{ backgroundColor: LIST_PAGE_BG }}>
      {breadcrumb && (
        <p className="text-xs text-gray-400 px-1">{breadcrumb}</p>
      )}

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
              style={{ backgroundColor: '#eef2f8', color: LIST_NAVY }}
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
                placeholder={searchPlaceholder}
                className="flex-1 pl-4 pr-2 py-2.5 border rounded-l-lg text-sm outline-none bg-white text-gray-700"
                style={{ borderColor: '#e0e4ec' }}
              />
              <button type="button" onClick={onSearchSubmit}
                className={`px-4 rounded-r-lg transition ${listBtnNavy}`}>
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
              {showPagination && onPageChange && (
                <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPageChange={onPageChange} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
