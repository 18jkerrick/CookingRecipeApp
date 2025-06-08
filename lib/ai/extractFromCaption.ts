import OpenAI from 'openai';

export async function extractRecipeFromCaption(text: string): Promise<{ 
  ingredients: string[]; 
  instructions: string[] 
}> {
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a recipe extraction expert. Your job is to extract structured recipe data from video captions/transcripts.

          Extract ALL ingredients and instructions mentioned in the text, even if they seem incomplete or informal.

          Return ONLY a JSON object in this exact format:
          {
            "ingredients": ["ingredient 1", "ingredient 2", ...],
            "instructions": ["step 1", "step 2", ...]
          }

          Guidelines:
          - Include quantities and measurements when mentioned (e.g., "2 cups flour", "4 cloves garlic")
          - If no quantity is given, include the ingredient anyway (e.g., "salt", "pepper")
          - Break down instructions into logical steps
          - Keep the original wording and style from the video
          - Don't add ingredients or steps that aren't mentioned
          - If you find recipe content, extract it. If no recipe is found, return empty arrays.`
        },
        {
          role: "user",
          content: `Extract the recipe from this video caption:\n\n${text}`
        }
      ],
      temperature: 0.1,
      max_tokens: 800,
    });

    const content = response.choices[0].message.content?.trim();
    
    if (!content) {
      return { ingredients: [], instructions: [] };
    }

    try {
      const parsed = JSON.parse(content);
      return {
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
        instructions: Array.isArray(parsed.instructions) ? parsed.instructions : []
      };
    } catch (parseError) {
      console.error('Error parsing AI response as JSON:', parseError);
      return { ingredients: [], instructions: [] };
    }
  } catch (error) {
    console.error('Error extracting recipe with AI:', error);
    return { ingredients: [], instructions: [] };
  }
} 