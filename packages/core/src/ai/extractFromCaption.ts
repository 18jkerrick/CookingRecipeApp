import OpenAI from 'openai';

export async function extractRecipeFromCaption(text: string): Promise<{ 
  ingredients: string[]; 
  instructions: string[] 
}> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🍽️ Caption extraction attempt ${attempt}/${MAX_RETRIES}...`);
      
      const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a recipe extraction expert. Your job is to extract structured recipe data from video captions ONLY if they contain actual recipe instructions.

          STRICT RULES FOR CAPTIONS:
          - Only extract if there are CLEAR, STRUCTURED recipe instructions with specific steps
          - Do NOT extract from mere descriptions like "chicken and rice" or "delicious pasta"
          - Do NOT extract if the caption just mentions food names without cooking steps
          - Do NOT extract if the caption says "recipe in bio" or "full recipe on [website]" 
          - Only extract if the caption contains actual cooking instructions like "cook for 10 minutes" or "add salt and pepper"

          Return ONLY a JSON object in this exact format:
          {
            "ingredients": ["ingredient 1", "ingredient 2", ...],
            "instructions": ["step 1", "step 2", ...]
          }

          Guidelines:
          - Include quantities and measurements when mentioned (e.g., "2 cups flour", "4 cloves garlic")
          - Break down instructions into logical steps
          - Keep the original wording and style from the video
          - Don't add ingredients or steps that aren't mentioned
          - If no ACTUAL RECIPE INSTRUCTIONS are found, return empty arrays
          - Descriptive text mentioning food is NOT a recipe`
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
        console.log(`⚠️ No content received on attempt ${attempt}`);
        return { ingredients: [], instructions: [] };
      }

      try {
        const parsed = JSON.parse(content);
        console.log(`✅ Caption extraction successful on attempt ${attempt}`);
        return {
          ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
          instructions: Array.isArray(parsed.instructions) ? parsed.instructions : []
        };
      } catch (parseError) {
        console.error(`❌ JSON parsing failed on attempt ${attempt}:`, parseError);
        return { ingredients: [], instructions: [] };
      }
      
    } catch (error: any) {
      console.error(`❌ Caption extraction attempt ${attempt} failed:`, error);
      
      // Check if it's a rate limit error and we have retries left
      if (error?.status === 429 && attempt < MAX_RETRIES) {
        console.log(`⏳ Rate limit hit, waiting ${RETRY_DELAY}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        continue;
      }
      
      // If it's the last attempt or not a rate limit error, fall back
      console.log('🔄 Falling back to empty recipe');
      return { ingredients: [], instructions: [] };
    }
  }
  
  // This should never be reached, but just in case
  return { ingredients: [], instructions: [] };
}
