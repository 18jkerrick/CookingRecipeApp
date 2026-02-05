import { RecipeCardSkeleton } from './RecipeCardSkeleton'

interface RecipeGridSkeletonProps {
  count?: number
}

export function RecipeGridSkeleton({ count = 8 }: RecipeGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  )
}
