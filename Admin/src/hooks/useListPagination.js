import { useState, useEffect, useMemo } from 'react';
import { LIST_PER_PAGE } from '../constants/listTheme';

export function useListPagination(items, { perPage = LIST_PER_PAGE, resetDeps = [] } = {}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(items.length / perPage) || 1;
  const paginated = useMemo(
    () => items.slice((page - 1) * perPage, page * perPage),
    [items, page, perPage]
  );

  useEffect(() => {
    setPage(1);
  }, resetDeps);

  useEffect(() => {
    if (page > totalPages) setPage(Math.max(1, totalPages));
  }, [page, totalPages]);

  return { page, setPage, perPage, totalPages, paginated, total: items.length };
}
