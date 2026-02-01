import OpenAI from 'openai';

/**
 * Transcribes audio blob to text using OpenAI Whisper API
 * @param audioBlob - Audio data as Blob
 * @returns Transcribed text
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Convert Blob to File (required by OpenAI API)
  const audioFile = new File([audioBlob], 'audio.mp3', {
    type: audioBlob.type || 'audio/mpeg'
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🎤 Audio transcription attempt ${attempt}/${MAX_RETRIES}...`);
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'text',
        language: 'en', // Can be removed to auto-detect
      });

      console.log(`✅ Audio transcription successful on attempt ${attempt}`);
      return transcription;

    } catch (error: any) {
      console.error(`❌ Audio transcription attempt ${attempt} failed:`, error);
      
      // Check if it's a rate limit error and we have retries left
      if (error?.status === 429 && attempt < MAX_RETRIES) {
        console.log(`⏳ Rate limit hit, waiting ${RETRY_DELAY}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        continue;
      }
      
      // If it's the last attempt or not a rate limit error, throw with specific error messages
      if (attempt === MAX_RETRIES) {
        if (error instanceof Error) {
          if (error.message.includes('quota')) {
            throw new Error('OpenAI quota exceeded for audio transcription');
          } else if (error.message.includes('file')) {
            throw new Error('Audio file format not supported by Whisper API');
          } else if (error.message.includes('size')) {
            throw new Error('Audio file too large for Whisper API (max 25MB)');
          }
        }
        
        throw new Error(`Audio transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  // This should never be reached, but just in case
  throw new Error('Audio transcription failed after all retry attempts');
}

/**
 * Fallback transcription when OpenAI Whisper fails
 * Returns a helpful error message for development
 */
export function fallbackTranscription(audioBlob: Blob): string {
  
  return `[TRANSCRIPTION UNAVAILABLE - OpenAI Whisper API failed]
  
This is a fallback message. In a production environment, you might:
- Use alternative transcription services (Google Speech-to-Text, Azure, etc.)
- Implement retry logic with exponential backoff
- Cache successful transcriptions
- Provide user feedback about transcription status

Audio info: ${audioBlob.size} bytes, type: ${audioBlob.type}`;
}
