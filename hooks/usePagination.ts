import { useState, useCallback, useEffect, useRef } from 'react';

interface CursorPaginationResult<T> {
  data: T[];
  isLoading: boolean;
  isFetching: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  refresh: () => void;
  reset: () => void;
  totalCount: number | null;
  cursor: string | null;
}

interface CursorPaginationOptions<T> {
  fetchFn: (cursor: string | null) => Promise<{ items: T[]; nextCursor: string | null; total: number }>;
  initialCursor?: string | null;
  limit?: number;
}

export function useCursorPagination<T>({
  fetchFn,
  initialCursor = null,
  limit = 20,
}: CursorPaginationOptions<T>): CursorPaginationResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(
    async (reset = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      const fetchCursor = reset ? null : cursor;

      if (reset) {
        setIsLoading(true);
      } else {
        setIsFetching(true);
      }
      setError(null);

      try {
        const result = await fetchFn(fetchCursor);
        setData((prev) => (reset ? result.items : [...prev, ...result.items]));
        setCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);
        setTotalCount(result.total);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      } finally {
        setIsLoading(false);
        setIsFetching(false);
        isFetchingRef.current = false;
      }
    },
    [cursor, fetchFn]
  );

  const loadMore = useCallback(() => {
    if (!isLoading && !isFetching && hasMore) {
      fetchData(false);
    }
  }, [fetchData, isLoading, isFetching, hasMore]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const reset = useCallback(() => {
    setData([]);
    setCursor(null);
    setHasMore(true);
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData(true);
  }, []);

  return {
    data,
    isLoading,
    isFetching,
    hasMore,
    error,
    loadMore,
    refresh,
    reset,
    totalCount,
    cursor,
  };
}

interface OffsetPaginationResult<T> {
  data: T[];
  isLoading: boolean;
  isFetching: boolean;
  hasMore: boolean;
  error: Error | null;
  page: number;
  totalPages: number;
  totalCount: number | null;
  loadPage: (page: number) => void;
  loadMore: () => void;
  goNext: () => void;
  goPrev: () => void;
  refresh: () => void;
}

interface OffsetPaginationOptions<T> {
  fetchFn: (page: number, limit: number) => Promise<{ items: T[]; total: number }>;
  limit?: number;
}

export function useOffsetPagination<T>({
  fetchFn,
  limit = 20,
}: OffsetPaginationOptions<T>): OffsetPaginationResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [allData, setAllData] = useState<T[]>([]);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set([1]));

  const totalPages = totalCount ? Math.ceil(totalCount / limit) : null;

  const fetchPage = useCallback(
    async (pageNum: number) => {
      if (loadedPages.has(pageNum) && pageNum > 1) {
        return;
      }

      setIsLoading(pageNum === 1);
      setIsFetching(pageNum > 1);
      setError(null);

      try {
        const result = await fetchFn(pageNum, limit);
        setData((prev) => (pageNum === 1 ? result.items : [...prev, ...result.items]));
        setAllData((prev) => (pageNum === 1 ? result.items : [...prev, ...result.items]));
        setTotalCount(result.total);
        setLoadedPages((prev) => new Set([...prev, pageNum]));
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      } finally {
        setIsLoading(false);
        setIsFetching(false);
      }
    },
    [fetchFn, limit, loadedPages]
  );

  const loadPage = useCallback(
    (pageNum: number) => {
      if (pageNum >= 1 && (!totalPages || pageNum <= totalPages)) {
        fetchPage(pageNum);
      }
    },
    [fetchPage, totalPages]
  );

  const loadMore = useCallback(() => {
    if (totalPages && page < totalPages) {
      loadPage(page + 1);
    }
  }, [page, totalPages, loadPage]);

  const goNext = useCallback(() => {
    if (totalPages && page < totalPages) {
      loadPage(page + 1);
    }
  }, [page, totalPages, loadPage]);

  const goPrev = useCallback(() => {
    if (page > 1) {
      loadPage(page - 1);
    }
  }, [page, loadPage]);

  const refresh = useCallback(() => {
    setLoadedPages(new Set());
    fetchPage(1);
  }, [fetchPage]);

  useEffect(() => {
    fetchPage(1);
  }, []);

  return {
    data: allData,
    isLoading,
    isFetching,
    hasMore: totalPages ? page < totalPages : false,
    error,
    page,
    totalPages: totalPages ?? 0,
    totalCount,
    loadPage,
    loadMore,
    goNext,
    goPrev,
    refresh,
  };
}

export default useCursorPagination;
