export function RecipeCardSkeleton() {
  return (
    <div 
      data-testid="recipe-skeleton"
      className="bg-wk-bg-surface rounded-lg overflow-hidden shadow-wk animate-pulse"
    >
      {/* Image placeholder */}
      <div className="h-40 bg-wk-bg-surface-hover" />
      {/* Content placeholder */}
      <div className="p-3">
        <div className="h-5 bg-wk-bg-surface-hover rounded w-3/4 mb-2" />
        <div className="h-4 bg-wk-bg-surface-hover rounded w-1/2" />
      </div>
    </div>
  )
}
