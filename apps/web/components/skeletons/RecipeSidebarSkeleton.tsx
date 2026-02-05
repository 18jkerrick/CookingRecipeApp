interface RecipeSidebarSkeletonProps {
  count?: number
}

export function RecipeSidebarSkeleton({ count = 6 }: RecipeSidebarSkeletonProps) {
  return (
    <div data-testid="recipe-sidebar-skeleton" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          data-testid="recipe-sidebar-skeleton-item"
          className="bg-wk-bg-primary rounded-lg p-3 animate-pulse border border-wk-border"
        >
          <div className="flex gap-3">
            {/* Thumbnail placeholder */}
            <div className="w-12 h-12 bg-wk-bg-surface-hover rounded flex-shrink-0" />
            {/* Content placeholder */}
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-wk-bg-surface-hover rounded w-3/4 mb-2" />
              <div className="h-3 bg-wk-bg-surface-hover rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
