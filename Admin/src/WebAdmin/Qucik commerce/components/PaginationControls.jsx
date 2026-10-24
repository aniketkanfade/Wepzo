import { ChevronLeft, ChevronRight } from 'lucide-react';
import { listBtnNavy, listBtnOutline } from '../../../constants/listTheme';

export default function PaginationControls({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
  label = 'entries',
}) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(value => value === 1 || value === totalPages || Math.abs(value - page) <= 1)
    .reduce((result, value, index, values) => {
      if (index > 0 && value - values[index - 1] > 1) result.push('…');
      result.push(value);
      return result;
    }, []);
  const start = total ? (page - 1) * perPage + 1 : 0;
  const end = Math.min(page * perPage, total);

  return <footer className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
    <p className="text-sm text-gray-500">Showing {start} to {end} of {total} {label}</p>
    <div className="flex flex-wrap items-center justify-end gap-2">
      {onPerPageChange && <label className="flex items-center gap-2 text-sm text-gray-500">
        Rows
        <select value={perPage} onChange={event => onPerPageChange(Number(event.target.value))} aria-label="Rows per page"
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700">
          {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>}
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Previous page"
          className={`grid h-9 w-9 place-items-center rounded-lg disabled:opacity-40 ${listBtnOutline}`}>
          <ChevronLeft size={16} />
        </button>
        {pages.map((value, index) => typeof value === 'string'
          ? <span key={`gap-${index}`} className="w-6 text-center text-gray-400" aria-hidden="true">…</span>
          : <button key={value} type="button" onClick={() => onPageChange(value)} aria-current={page === value ? 'page' : undefined}
            className={`min-w-9 h-9 rounded-lg px-2 text-sm font-medium ${page === value ? listBtnNavy : listBtnOutline}`}>
            {value}
          </button>)}
        <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label="Next page"
          className={`grid h-9 w-9 place-items-center rounded-lg disabled:opacity-40 ${listBtnOutline}`}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  </footer>;
}
