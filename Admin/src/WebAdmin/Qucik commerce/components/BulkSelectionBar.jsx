import { useRef, useState } from 'react';

export default function BulkSelectionBar({
  total,
  label = 'entries',
  allSelected,
  selectedCount,
  onToggleAll,
  onBulkDelete,
}) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const handleBulkDelete = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await onBulkDelete();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (!onBulkDelete) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={allSelected} onChange={onToggleAll}
          aria-label={`Select all ${total} filtered ${label}`} />
        Select all {total} filtered {label}
      </label>
      {selectedCount > 0 && <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">{selectedCount} selected</span>
        <button type="button" onClick={handleBulkDelete} disabled={busy}
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-wait disabled:opacity-50">
          {busy ? 'Deleting…' : `Delete selected (${selectedCount})`}
        </button>
      </div>}
    </div>
  );
}
