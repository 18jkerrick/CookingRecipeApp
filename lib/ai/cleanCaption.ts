import OpenAI from 'openai';

export async function cleanCaption(raw: string): Promise<string> {
  
  // If input is empty or just whitespace, return empty string
  if (!raw || !raw.trim()) {
    return '';
  }
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a caption cleaning assistant. Your job is to clean and normalize video captions/transcripts by:
          1. Removing timestamp markers like [00:15] or (0:30)
          2. Removing speaker labels like "SPEAKER 1:" or "Host:"
          3. Fixing common transcription errors and typos
          4. Normalizing punctuation and spacing
          5. Keeping all recipe-related content intact
          6. Making the text flow naturally and be easy to read
          
          Return only the cleaned caption text, nothing else.`
        },
        {
          role: "user",
          content: `Please clean this video caption/transcript:\n\n${raw}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const cleaned = response.choices[0].message.content?.trim() || raw;
    return cleaned;
  } catch (error) {
    console.error('Error cleaning caption with AI:', error);
    // Fallback to basic cleaning if AI fails
    const fallback = raw
      .replace(/\[?\d{1,2}:\d{2}\]?/g, '')
      .replace(/\(\d{1,2}:\d{2}\)/g, '')
      .replace(/^[A-Z\s]+:/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
    return fallback;
  }
} 