import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function detectMusicContent(transcript: string): Promise<boolean> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🎶 Music detection attempt ${attempt}/${MAX_RETRIES}...`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Analyze the transcript to determine if it contains music, song lyrics, or non-cooking content.

RETURN TRUE if the content is:
- Song lyrics or music
- Poetry or rhyming content  
- Non-cooking related speech (fitness, beauty, lifestyle, etc.)
- Nonsensical or gibberish text
- Background music with no clear speech
- Content that has no cooking instructions, ingredients, or food preparation

RETURN FALSE if the content contains:
- Cooking instructions or recipe steps
- Ingredient lists or food items
- Cooking techniques or methods
- Kitchen equipment mentions
- Food preparation descriptions

Respond with only "true" or "false" - no explanation needed.`
          },
          {
            role: "user", 
            content: `Transcript: ${transcript}`
          }
        ],
        temperature: 0,
        max_tokens: 10
      });

      const result = response.choices[0]?.message?.content?.trim().toLowerCase();
      const isMusic = result === 'true';
      
      console.log(`✅ Music detection successful on attempt ${attempt}`);
      return isMusic;
      
    } catch (error: any) {
      console.error(`❌ Music detection attempt ${attempt} failed:`, error);
      
      // Check if it's a rate limit error and we have retries left
      if (error?.status === 429 && attempt < MAX_RETRIES) {
        console.log(`⏳ Rate limit hit, waiting ${RETRY_DELAY}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        continue;
      }
      
      // If it's the last attempt or not a rate limit error, fall back
      console.log('🔄 Falling back to default: assuming cooking content');
      return false; // Default to false (assume it's cooking content) to avoid blocking valid recipes
    }
  }
  
  // This should never be reached, but just in case
  return false;
} 