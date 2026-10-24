import { useEffect, useMemo, useState } from 'react';

export function useBulkSelection(items, idKey = '_id') {
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const availableIds = useMemo(() => new Set(items.map(item => String(item[idKey]))), [items, idKey]);

  useEffect(() => {
    setSelectedIds(current => {
      const next = new Set([...current].filter(id => availableIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [availableIds]);

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.has(String(item[idKey]))),
    [items, selectedIds, idKey]
  );
  const allSelected = items.length > 0 && items.every(item => selectedIds.has(String(item[idKey])));

  const toggle = id => {
    const key = String(id);
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => setSelectedIds(current => {
    const next = new Set(current);
    if (allSelected) items.forEach(item => next.delete(String(item[idKey])));
    else items.forEach(item => next.add(String(item[idKey])));
    return next;
  });

  const clear = () => setSelectedIds(new Set());

  return { selectedIds, selectedItems, allSelected, toggle, toggleAll, clear };
}
