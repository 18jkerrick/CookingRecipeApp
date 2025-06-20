import { getYoutubeTranscript } from './youtube';

/**
 * Extract transcript from video URL (auto-generated captions/subtitles)
 * This is separate from captions (descriptions) and audio transcription
 */
export async function getVideoTranscript(url: string): Promise<string> {
  try {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return await getYoutubeTranscript(url);
    } else if (url.includes('tiktok.com')) {
      // TikTok doesn't have auto-generated transcripts like YouTube
      throw new Error('TikTok videos do not have auto-generated transcripts');
    } else if (url.includes('instagram.com')) {
      // Instagram doesn't have auto-generated transcripts
      throw new Error('Instagram videos do not have auto-generated transcripts');  
    } else {
      throw new Error('Transcript extraction not supported for this platform');
    }
  } catch (error) {
    console.error('Error extracting video transcript:', error);
    throw error;
  }
} 