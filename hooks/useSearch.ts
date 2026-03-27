import { useState, useEffect, useCallback, useMemo, useRef } from 'react';



export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface UseSearchOptions<T> {
  data: T[];
  searchKeys: (keyof T)[];
  debounceMs?: number;
  caseSensitive?: boolean;
}

export function useSearch<T>({
  data,
  searchKeys,
  debounceMs = 300,
  caseSensitive = false,
}: UseSearchOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, debounceMs]);

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return data;
    }

    const search = caseSensitive ? debouncedSearchTerm : debouncedSearchTerm.toLowerCase();

    return data.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        if (value == null) return false;
        const stringValue = String(value);
        return caseSensitive
          ? stringValue.includes(search)
          : stringValue.toLowerCase().includes(search);
      })
    );
  }, [data, debouncedSearchTerm, searchKeys, caseSensitive]);

  return {
    searchTerm,
    setSearchTerm,
    filteredData,
    resultCount: filteredData.length,
    totalCount: data.length,
    isFiltered: debouncedSearchTerm.trim().length > 0,
  };
}

interface UseFilterOptions<T> {
  data: T[];
  filterFn?: (item: T) => boolean;
}

export function useFilter<T>({ data, filterFn }: UseFilterOptions<T>) {
  const [activeFilters, setActiveFilters] = useState<Partial<Record<string, any>>>({});

  const filteredData = useMemo(() => {
    if (!filterFn) return data;
    return data.filter(filterFn);
  }, [data, filterFn]);

  const setFilter = useCallback((key: string, value: any) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const clearFilter = useCallback((key: string) => {
    setActiveFilters((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return {
    filteredData,
    activeFilters,
    setFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
  };
}

export default useDebounce;
