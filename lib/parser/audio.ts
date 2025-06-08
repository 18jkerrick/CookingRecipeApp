import { spawn } from 'child_process';
import { Readable } from 'stream';

/**
 * Downloads audio stream from a video URL and returns it as a Blob
 * Supports YouTube, TikTok, Instagram, and other platforms via yt-dlp
 */
export async function fetchAudio(url: string): Promise<Blob> {
  
  try {
    // First try ytdl-core for YouTube (faster and more reliable)
    if (isYouTubeUrl(url)) {
      return await fetchYouTubeAudio(url);
    }
    
    // For other platforms, use yt-dlp
    return await fetchAudioWithYtDlp(url);
    
  } catch (error) {
    console.error('Audio extraction failed:', error);
    throw new Error(`Failed to extract audio from URL: ${url}`);
  }
}

/**
 * Extract audio from YouTube using ytdl-core
 */
async function fetchYouTubeAudio(url: string): Promise<Blob> {
  // @ts-ignore - ytdl-core doesn't have official types
  const ytdl = await import('ytdl-core');
  
  return new Promise((resolve, reject) => {
    const audioStream = ytdl.default(url, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });
    
    const chunks: Buffer[] = [];
    
    audioStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    audioStream.on('end', () => {
      const audioBuffer = Buffer.concat(chunks);
      const blob = new Blob([audioBuffer], { type: 'audio/webm' });
      resolve(blob);
    });
    
    audioStream.on('error', (error: Error) => {
      console.error('ytdl-core error:', error);
      reject(error);
    });
  });
}

/**
 * Extract audio using yt-dlp (universal extractor)
 */
async function fetchAudioWithYtDlp(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Use yt-dlp to extract audio
    const ytDlp = spawn('yt-dlp', [
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '192K',
      '--no-playlist',
      '--output', '-',  // Output to stdout
      url
    ]);
    
    const chunks: Buffer[] = [];
    
    ytDlp.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    ytDlp.stderr.on('data', (data: Buffer) => {
    });
    
    ytDlp.on('close', (code: number | null) => {
      if (code === 0) {
        const audioBuffer = Buffer.concat(chunks);
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        resolve(blob);
      } else {
        reject(new Error(`yt-dlp process exited with code ${code}`));
      }
    });
    
    ytDlp.on('error', (error: Error) => {
      console.error('yt-dlp spawn error:', error);
      reject(error);
    });
  });
}

/**
 * Check if URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
}

/**
 * Validate that the blob contains audio data
 */
export function validateAudioBlob(blob: Blob): boolean {
  // Check MIME type
  const validAudioTypes = ['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav'];
  const isValidType = validAudioTypes.includes(blob.type);
  
  // Check size (should be > 0)
  const hasContent = blob.size > 0;
  
  return isValidType && hasContent;
} 