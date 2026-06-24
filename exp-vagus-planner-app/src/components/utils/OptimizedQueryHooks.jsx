import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';

// Optimized query with automatic pagination
export function useOptimizedList(entityName, options = {}) {
  const {
    pageSize = 20,
    sortBy = '-created_date',
    filters = {},
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
  } = options;

  return useQuery({
    queryKey: [entityName, 'list', sortBy, filters],
    queryFn: () => SDK.entities[entityName].filter(filters, sortBy, pageSize),
    enabled,
    staleTime,
    cacheTime,
    refetchOnWindowFocus: false,
  });
}

// Infinite scroll query
export function useInfiniteList(entityName, options = {}) {
  const {
    pageSize = 20,
    sortBy = '-created_date',
    filters = {},
    enabled = true,
  } = options;

  return useInfiniteQuery({
    queryKey: [entityName, 'infinite', sortBy, filters],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await SDK.entities[entityName].filter(
        filters,
        sortBy,
        pageSize,
        pageParam
      );
      return {
        data,
        nextCursor: data.length === pageSize ? pageParam + pageSize : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
}

// Prefetch helper
export function usePrefetch(queryClient) {
  return (entityName, filters = {}, sortBy = '-created_date') => {
    queryClient.prefetchQuery({
      queryKey: [entityName, 'list', sortBy, filters],
      queryFn: () => SDK.entities[entityName].filter(filters, sortBy, 20),
      staleTime: 5 * 60 * 1000,
    });
  };
}