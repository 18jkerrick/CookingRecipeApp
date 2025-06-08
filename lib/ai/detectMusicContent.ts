import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function detectMusicContent(transcript: string): Promise<boolean> {
  try {
    
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
    
    return isMusic;
    
  } catch (error) {
    console.error('Error detecting music content:', error);
    // Default to false (assume it's cooking content) to avoid blocking valid recipes
    return false;
  }
} 