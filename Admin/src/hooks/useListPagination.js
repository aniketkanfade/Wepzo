import { useState, useEffect, useMemo } from 'react';
import { LIST_PER_PAGE } from '../constants/listTheme';

export function useListPagination(items, { perPage = LIST_PER_PAGE, resetDeps = [] } = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(perPage);
  const totalPages = Math.ceil(items.length / pageSize) || 1;
  const paginated = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
    setPageSize(perPage);
  }, resetDeps);

  useEffect(() => {
    if (page > totalPages) setPage(Math.max(1, totalPages));
  }, [page, totalPages]);

  const changePageSize = value => {
    setPageSize(value);
    setPage(1);
  };

  return { page, setPage, perPage: pageSize, setPerPage: changePageSize, totalPages, paginated, total: items.length };
}
