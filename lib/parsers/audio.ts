import { spawn } from 'child_process';
import { Readable } from 'stream';
import { extractTikTokDataWithBrowser } from './tiktok-browser';

/**
 * Downloads audio stream from a video URL and returns it as a Blob
 * Supports YouTube, TikTok, Instagram, and other platforms via yt-dlp
 */
export async function fetchAudio(url: string): Promise<Blob> {
  
  try {
    // For TikTok photo posts, try to extract background music using browser automation
    if (url.includes('tiktok.com') && url.includes('/photo/')) {
      console.log('📸 TikTok photo post detected - attempting background music extraction');
      return await fetchTikTokPhotoAudio(url);
    }
    
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
 * Extract background music from TikTok photo posts using browser automation
 */
async function fetchTikTokPhotoAudio(url: string): Promise<Blob> {
  try {
    console.log('🚀 Using browser automation to find TikTok photo background music...');
    const tikTokData = await extractTikTokDataWithBrowser(url);
    
    if (tikTokData.audioUrl) {
      console.log(`🎵 Found audio URL: ${tikTokData.audioUrl.substring(0, 100)}...`);
      
      // Download the audio file
      const response = await fetch(tikTokData.audioUrl, {
        headers: {
          'Referer': 'https://www.tiktok.com/',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status}`);
      }
      
      const audioBuffer = await response.arrayBuffer();
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      console.log(`✅ Downloaded TikTok background music: ${blob.size} bytes`);
      return blob;
    } else {
      console.log('❌ No audio URL found in TikTok photo post');
      throw new Error('No background music found in TikTok photo post');
    }
  } catch (error) {
    console.log(`❌ TikTok photo audio extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
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
    // For TikTok, use a different approach since --extract-audio can be unreliable
    const isTikTok = url.includes('tiktok.com');
    
    let ytDlpArgs: string[];
    
    if (isTikTok) {
      // For TikTok: download video with audio and let yt-dlp handle audio extraction differently
      ytDlpArgs = [
        '--format', 'best[acodec!=none]/best',  // Get best quality with audio
        '--extract-audio',
        '--audio-format', 'mp3',
        '--no-playlist',
        '--output', '-',  // Output to stdout
        url
      ];
    } else {
      // For other platforms: use the standard audio extraction
      ytDlpArgs = [
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '192K',
        '--no-playlist',
        '--output', '-',  // Output to stdout
        url
      ];
    }
    
    console.log(`🔧 Using yt-dlp args for ${isTikTok ? 'TikTok' : 'other platform'}:`, ytDlpArgs.join(' '));
    
    // Use yt-dlp to extract audio
    console.log(`🚀 Starting yt-dlp process...`);
    const ytDlp = spawn('yt-dlp', ytDlpArgs);
    
    console.log(`📋 Process spawned with PID: ${ytDlp.pid}`);
    
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let chunkCount = 0;
    const startTime = Date.now();
    
    ytDlp.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      totalBytes += chunk.length;
      chunkCount++;
      
      // Log progress every 100 chunks or every 1MB
      if (chunkCount % 100 === 0 || totalBytes % (1024 * 1024) < chunk.length) {
        const elapsed = Date.now() - startTime;
        const mbReceived = (totalBytes / 1024 / 1024).toFixed(2);
        const speed = totalBytes / elapsed; // bytes per ms
        const mbps = (speed * 8 / 1024).toFixed(2); // Mbps
        console.log(`📊 Audio download progress: ${mbReceived}MB received (${chunkCount} chunks) in ${elapsed}ms at ${mbps}Mbps`);
      }
    });
    
    ytDlp.stderr.on('data', (data: Buffer) => {
      const errorOutput = data.toString();
      console.log(`🔍 yt-dlp stderr: ${errorOutput.trim()}`);
    });
    
    ytDlp.on('close', (code: number | null) => {
      const elapsed = Date.now() - startTime;
      const finalMB = (totalBytes / 1024 / 1024).toFixed(2);
      
      console.log(`🏁 yt-dlp process completed: code=${code}, ${finalMB}MB total, ${chunkCount} chunks, ${elapsed}ms total time`);
      
      if (code === 0) {
        console.log(`🔗 Creating audio blob from ${chunks.length} chunks...`);
        const audioBuffer = Buffer.concat(chunks);
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        console.log(`✅ Audio blob created successfully: ${blob.size} bytes, type: ${blob.type}`);
        resolve(blob);
      } else {
        console.log(`❌ yt-dlp failed with exit code ${code} after ${elapsed}ms`);
        reject(new Error(`yt-dlp process exited with code ${code}`));
      }
    });
    
    ytDlp.on('error', (error: Error) => {
      const elapsed = Date.now() - startTime;
      console.error(`❌ yt-dlp spawn error after ${elapsed}ms:`, error);
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