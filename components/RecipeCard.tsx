interface RecipeCardProps {
  title?: string;
  imageUrl?: string;
  processing?: boolean;
}

export default function RecipeCard({ title, imageUrl, processing = false }: RecipeCardProps) {
  if (processing) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Shimmer image placeholder */}
        <div className="aspect-square bg-gray-200 animate-pulse"></div>
        
        {/* Shimmer title placeholder */}
        <div className="p-4 h-20 flex flex-col justify-start">
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      {/* Recipe image */}
      <div className="aspect-square bg-gray-100 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || 'Recipe'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-400 text-4xl">🍽️</div>
        )}
      </div>
      
      {/* Recipe title */}
      <div className="p-4 h-20 flex items-start justify-center">
        <h3 className="font-semibold text-gray-900 leading-tight text-center line-clamp-2">
          {title || 'Untitled Recipe'}
        </h3>
      </div>
    </div>
  );
} 