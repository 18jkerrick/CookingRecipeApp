interface RecipeCardProps {
  ingredients: string[];
  instructions: string[];
}

export default function RecipeCard({ ingredients, instructions }: RecipeCardProps) {
  return (
    <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Extracted Recipe</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Ingredients */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Ingredients</h3>
          <ul className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span className="text-gray-600">{ingredient}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Instructions</h3>
          <ol className="space-y-2">
            {instructions.map((instruction, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2 font-medium">{index + 1}.</span>
                <span className="text-gray-600">{instruction}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
} 