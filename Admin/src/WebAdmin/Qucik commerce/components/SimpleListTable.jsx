import { Edit, Trash2, Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  LIST_NAVY, LIST_CARD_BORDER, listBtnNavy, listBtnOutline,
  listTheadClass, listTheadStyle, listThClass, listRowClass, listRowStyle, listTdClass,
} from '../../../constants/listTheme';

function ListPagination({ page, totalPages, total, perPage, onPageChange }) {
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

export default function SimpleListTable({
  title, count, search, setSearch, setPage, searchPlaceholder, onExport,
  paginated, page, perPage, filtered, totalPages, idKey, onEdit, onDelete, extraColumns = [],
  embedded = false,
}) {
  const colCount = 4 + extraColumns.length;
  const outerClass = embedded
    ? 'flex flex-col min-h-0'
    : 'flex flex-col max-h-[calc(100vh-7rem)] rounded-xl border shadow-sm overflow-hidden bg-white';

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
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={searchPlaceholder}
              className="pl-8 pr-3 py-2.5 border rounded-lg text-sm w-48 outline-none bg-white"
              style={{ borderColor: '#e0e4ec' }}
            />
          </div>
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
        <ListPagination
          page={page}
          totalPages={totalPages}
          total={filtered?.length ?? 0}
          perPage={perPage}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
