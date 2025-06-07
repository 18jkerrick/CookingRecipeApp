import OpenAI from 'openai';

/**
 * Transcribes audio blob to text using OpenAI Whisper API
 * @param audioBlob - Audio data as Blob
 * @returns Transcribed text
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  console.log('Starting audio transcription with Whisper API');
  console.log('Audio blob info:', {
    size: audioBlob.size,
    type: audioBlob.type
  });

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Convert Blob to File (required by OpenAI API)
    const audioFile = new File([audioBlob], 'audio.mp3', {
      type: audioBlob.type || 'audio/mpeg'
    });

    console.log('Sending audio to Whisper API...');
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'text',
      language: 'en', // Can be removed to auto-detect
    });

    console.log('Whisper transcription completed');
    console.log('Transcript length:', transcription.length, 'characters');
    console.log('Transcript preview:', transcription.substring(0, 200) + '...');

    return transcription;

  } catch (error) {
    console.error('Whisper transcription failed:', error);
    
    // Provide more specific error messages
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

/**
 * Fallback transcription when OpenAI Whisper fails
 * Returns a helpful error message for development
 */
export function fallbackTranscription(audioBlob: Blob): string {
  console.log('Using fallback transcription (no actual transcription performed)');
  
  return `[TRANSCRIPTION UNAVAILABLE - OpenAI Whisper API failed]
  
This is a fallback message. In a production environment, you might:
- Use alternative transcription services (Google Speech-to-Text, Azure, etc.)
- Implement retry logic with exponential backoff
- Cache successful transcriptions
- Provide user feedback about transcription status

Audio info: ${audioBlob.size} bytes, type: ${audioBlob.type}`;
} 