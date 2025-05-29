export async function extractRecipe(transcript: string): Promise<{
  ingredients: string[];
  instructions: string[];
}> {
  // TODO: Implement actual AI recipe extraction
  return {
    ingredients: [
      "1 egg",
      "2 cups flour", 
      "1 cup sugar",
      "1/2 cup butter"
    ],
    instructions: [
      "Beat egg",
      "Mix flour and sugar",
      "Add butter and combine",
      "Bake at 350°F for 20 minutes"
    ]
  };
} 