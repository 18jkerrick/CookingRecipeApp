'use client'

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Default configuration values
const DEFAULT_PAGE_SIZE = 20
const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000  // 5 minutes
const DEFAULT_GC_TIME_MS = 30 * 60 * 1000    // 30 minutes

// Types
export interface Recipe {
  id: string
  title: string
  thumbnail: string | null
  ingredients: string[]
  instructions: string[]
  platform: string
  source: string
  original_url: string | null
  created_at: string
  user_id: string
  normalized_ingredients: Array<{
    original: string
    name: string
    quantity: number | null
    unit: string | null
    category: string
  }>
}

interface RecipesResponse {
  recipes: Recipe[]
  nextCursor: string | null
  hasMore: boolean
}

interface UseRecipesOptions {
  pageSize?: number
  enabled?: boolean
}

// Fetch function
async function fetchRecipes(params: { 
  cursor?: string
  limit: number 
  token: string 
}): Promise<RecipesResponse> {
  const { cursor, limit, token } = params
  
  const url = new URL('/api/recipes', window.location.origin)
  url.searchParams.set('limit', String(limit))
  if (cursor) {
    url.searchParams.set('cursor', cursor)
  }
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch recipes: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Hook for fetching recipes with infinite scroll pagination.
 * Uses React Query for caching, background refetching, and optimistic updates.
 * 
 * @example
 * ```tsx
 * const { 
 *   recipes, 
 *   isLoading, 
 *   hasNextPage, 
 *   fetchNextPage,
 *   isFetchingNextPage 
 * } = useRecipes({ token })
 * ```
 */
export function useRecipes(token: string | null, options?: UseRecipesOptions) {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE
  const enabled = options?.enabled ?? true
  
  const query = useInfiniteQuery({
    queryKey: ['recipes'],
    queryFn: ({ pageParam }) => 
      fetchRecipes({ 
        cursor: pageParam, 
        limit: pageSize,
        token: token!,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // Only return cursor if hasMore is true AND there's a valid cursor
      if (lastPage.hasMore && lastPage.nextCursor) {
        return lastPage.nextCursor
      }
      return undefined // No more pages
    },
    enabled: enabled && !!token,
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    refetchOnMount: 'always',
    placeholderData: (previousData) => previousData,
  })

  // Flatten all pages into a single array
  const recipes = query.data?.pages.flatMap(page => page.recipes) ?? []
  
  // Explicitly check hasMore from the last page
  const lastPage = query.data?.pages[query.data.pages.length - 1]
  const hasMoreData = lastPage?.hasMore ?? false
  const hasNextPage = hasMoreData && !!lastPage?.nextCursor
  
  return {
    recipes,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
  }
}

/**
 * Hook for deleting a recipe with optimistic update.
 */
export function useDeleteRecipe(token: string | null) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (recipeId: string) => {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete recipe')
      }
      
      return recipeId
    },
    onMutate: async (recipeId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['recipes'] })
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['recipes'])
      
      // Optimistically remove the recipe
      queryClient.setQueryData(['recipes'], (old: { pages: RecipesResponse[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            recipes: page.recipes.filter(r => r.id !== recipeId),
          })),
        }
      })
      
      return { previousData }
    },
    onError: (_err, _recipeId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['recipes'], context.previousData)
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
