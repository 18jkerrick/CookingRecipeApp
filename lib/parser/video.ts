import ffmpeg from 'fluent-ffmpeg';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Extract recipe information from video using computer vision analysis
 * This analyzes cooking actions, ingredients, and techniques visible in video frames
 */
export async function extractTextFromVideo(url: string): Promise<string> {
  try {
    // Check if this is a TikTok photo/slideshow post
    if (url.includes('tiktok.com') && url.includes('/photo/')) {
      return await extractTextFromTikTokPhotos(url);
    }
    
    // Step 1: Extract strategic frames from video
    const frames = await extractCookingFrames(url);
    
    if (frames.length === 0) {
      throw new Error('No frames extracted from video');
    }
    
    // Step 2: Analyze frames with computer vision for cooking content
    const analysisResults = await analyzeFramesWithVision(frames);
    
    // Step 3: Combine analysis into coherent recipe text
    const recipeText = combineVisionAnalysis(analysisResults);
    
    return recipeText;
    
  } catch (error) {
    console.error('❌ Video analysis failed:', error);
    throw new Error(`Failed to analyze video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract and analyze images from TikTok photo/slideshow posts
 */
async function extractTextFromTikTokPhotos(url: string): Promise<string> {
  try {
    // Use yt-dlp to download images from TikTok photo post
    const imageBuffers = await downloadTikTokPhotos(url);
    
    if (imageBuffers.length === 0) {
      throw new Error(`TikTok photo posts are protected by anti-bot measures and cannot be automatically analyzed. 

Alternative options:
1. Try a regular TikTok video URL (not /photo/) 
2. Screenshot the images and upload them directly
3. Copy any text/captions from the post manually

TikTok's photo slideshow format is not supported due to technical restrictions.`);
    }
    
    // Analyze images with computer vision for cooking content
    const analysisResults = await analyzeFramesWithVision(imageBuffers);
    
    // Combine analysis into coherent recipe text
    const recipeText = combineVisionAnalysis(analysisResults);
    
    return recipeText;
    
  } catch (error) {
    console.error('❌ TikTok photo analysis failed:', error);
    throw new Error(`Failed to analyze TikTok photos: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download images from TikTok photo post using yt-dlp (similar to video download)
 */
async function downloadTikTokPhotos(url: string): Promise<Buffer[]> {
  // Try multiple yt-dlp approaches for photo posts
  const attempts = [
    // Attempt 1: Try to extract all available thumbnails/images
    {
      name: 'Extract all thumbnails and images',
      args: [
        '--write-all-thumbnails',
        '--write-info-json', 
        '--skip-download',  // Don't download video, just thumbnails
        '--output', 'temp_tiktok_photos/%(title)s_%(id)s.%(ext)s',
        url
      ]
    },
    // Attempt 2: Force TikTok extractor and extract thumbnails
    {
      name: 'Force TikTok extractor with thumbnails',
      args: [
        '--force-extractor', 'tiktok',
        '--write-all-thumbnails',
        '--skip-download',
        '--output', 'temp_tiktok_photos/%(title)s_%(id)s.%(ext)s',
        url
      ]
    },
    // Attempt 3: Try to download as playlist (photo posts might be treated as playlists)
    {
      name: 'Download as playlist',
      args: [
        '--yes-playlist',
        '--write-thumbnail',
        '--skip-download',
        '--output', 'temp_tiktok_photos/%(playlist_index)s_%(title)s.%(ext)s',
        url
      ]
    },
    // Attempt 4: Extract best quality thumbnails only
    {
      name: 'Extract best thumbnails',
      args: [
        '--write-thumbnail',
        '--thumbnail-format', 'jpg/png/webp',
        '--skip-download',
        '--output', 'temp_tiktok_photos/%(title)s.%(ext)s',
        url
      ]
    }
  ];

  const outputDir = 'temp_tiktok_photos';
  
  // Create temp directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  for (const attempt of attempts) {
    try {
      const success = await new Promise<boolean>((resolve) => {
        const ytdlp = spawn('yt-dlp', attempt.args);
        
        let hasOutput = false;
        
        ytdlp.stdout.on('data', (data) => {
          hasOutput = true;
        });

        ytdlp.stderr.on('data', (data) => {
          const output = data.toString();
          if (output.includes('Downloading') || output.includes('Writing')) {
            hasOutput = true;
          }
        });

        ytdlp.on('close', (code) => {
          resolve(code === 0 && hasOutput);
        });

        ytdlp.on('error', (error) => {
          console.error(`yt-dlp error for ${attempt.name}:`, error);
          resolve(false);
        });
      });

      if (success) {
        // Check if we got any image files
        const files = fs.readdirSync(outputDir);
        const imageFiles = files.filter(file => file.match(/\.(jpg|jpeg|png|webp)$/i));
        
        if (imageFiles.length > 0) {
          // Read the image files into buffers
          const imageBuffers: Buffer[] = [];
          for (const file of imageFiles) {
            const filePath = `${outputDir}/${file}`;
            const buffer = fs.readFileSync(filePath);
            if (buffer.length > 1000) { // Valid image size check
              imageBuffers.push(buffer);
            }
          }
          
          // Cleanup temp files
          files.forEach(file => {
            try {
              fs.unlinkSync(`${outputDir}/${file}`);
            } catch (e) {
              // Ignore cleanup errors
            }
          });
          
          // Remove temp directory if empty
          try {
            fs.rmdirSync(outputDir);
          } catch (e) {
            // Ignore if directory not empty or doesn't exist
          }
          
          return imageBuffers;
        }
      }
    } catch (error) {
      // Continue to next attempt
    }
  }

  // Clean up any remaining temp files
  try {
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      files.forEach(file => fs.unlinkSync(`${outputDir}/${file}`));
      fs.rmdirSync(outputDir);
    }
  } catch (e) {
    // Ignore cleanup errors
  }

  return []; // No images extracted
}

/**
 * Extract strategic frames showing cooking actions and ingredients
 * Focuses on key moments: beginning (ingredients), middle (cooking), end (plating)
 */
export async function extractCookingFrames(url: string, maxFrames: number = 5): Promise<Buffer[]> {
  try {
    // Download video first (similar to audio approach)
    const videoPath = await downloadVideoForFrames(url);
    
    // Extract frames at strategic intervals for cooking analysis
    const frames = await extractFramesFromLocalFile(videoPath, maxFrames);
    
    // Clean up downloaded video
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
    
    if (frames.length === 0) {
      throw new Error('No frames extracted from video');
    }
    
    return frames;
    
  } catch (error) {
    console.error('❌ Frame extraction failed:', error);
    throw new Error(`Failed to extract frames from video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get video stream URL using yt-dlp (handles TikTok, Instagram, YouTube)
 */
export async function getVideoStreamUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', [
      '--get-url',
      '--format', 'best[ext=mp4]/best',
      url
    ]);

    let output = '';
    let errorOutput = '';

    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code === 0 && output.trim()) {
        resolve(output.trim().split('\n')[0]); // Get first URL
      } else {
        reject(new Error(`yt-dlp failed: ${errorOutput || 'No output'}`));
      }
    });

    ytdlp.on('error', (error) => {
      reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
    });
  });
}

/**
 * Download video for frame extraction using yt-dlp
 */
async function downloadVideoForFrames(url: string): Promise<string> {
  const outputPath = 'temp_video_frames.mp4';
  
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', [
      '--format', 'best[ext=mp4]/best',
      '--output', outputPath,
      url
    ]);

    let errorOutput = '';

    ytdlp.stdout.on('data', (data) => {
      // Show download progress
      process.stdout.write(data);
    });

    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        reject(new Error(`Video download failed: ${errorOutput}`));
      }
    });

    ytdlp.on('error', (error) => {
      reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
    });
  });
}

/**
 * Extract frames from local video file using FFmpeg
 * Strategic timing: early frames (ingredients), middle frames (cooking), late frames (plating)
 */
async function extractFramesFromLocalFile(videoPath: string, maxFrames: number): Promise<Buffer[]> {
  const frames: Buffer[] = [];
  
  // Get video duration first
  const videoDuration = await getVideoDuration(videoPath);
  
  // Generate adaptive timestamps based on video length
  const timestamps = generateAdaptiveTimestamps(videoDuration);
  
  // Extract each frame individually for better reliability
  for (let i = 0; i < timestamps.length; i++) {
    try {
      const timestamp = timestamps[i];
      
      const frame = await extractSingleFrame(videoPath, timestamp);
      if (frame && frame.length > 1000) { // Valid frame size check
        frames.push(frame);
      }
      
      // Small delay between extractions
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Failed to extract frame at ${timestamps[i]}s:`, error);
      // Continue with other frames - this is expected for some videos at end timestamps
      continue;
    }
  }
  
  return frames;
}

/**
 * Extract a single frame at a specific timestamp
 */
async function extractSingleFrame(videoPath: string, timestampSeconds: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Format timestamp as HH:MM:SS
    const hours = Math.floor(timestampSeconds / 3600);
    const minutes = Math.floor((timestampSeconds % 3600) / 60);
    const seconds = timestampSeconds % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const ffmpegProcess = spawn('ffmpeg', [
      '-i', videoPath,
      '-ss', timeStr, // Seek to specific timestamp
      '-frames:v', '1', // Extract exactly 1 frame
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-q:v', '2', // High quality
      '-y',
      'pipe:1'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let frameBuffer = Buffer.alloc(0);

    ffmpegProcess.stdout.on('data', (chunk) => {
      frameBuffer = Buffer.concat([frameBuffer, chunk]);
    });

    ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Error') || output.includes('Invalid')) {
        console.error(`FFmpeg warning for timestamp ${timeStr}:`, output.trim());
      }
    });

    ffmpegProcess.on('close', (code) => {
      if (code === 0 && frameBuffer.length > 1000) {
        resolve(frameBuffer);
      } else {
        reject(new Error(`Failed to extract frame at ${timeStr}, buffer size: ${frameBuffer.length}`));
      }
    });

    ffmpegProcess.on('error', (error) => {
      reject(new Error(`FFmpeg process error: ${error.message}`));
    });

    // Timeout for single frame extraction (extended for quality)
    setTimeout(() => {
      ffmpegProcess.kill('SIGTERM');
      if (frameBuffer.length > 1000) {
        resolve(frameBuffer);
      } else {
        reject(new Error(`Frame extraction timeout at ${timeStr}`));
      }
    }, 60000); // 60 seconds - allow plenty of time for quality extraction
  });
}

/**
 * Extract frames from video stream using FFmpeg (legacy - now using local file approach)
 * Strategic timing: early frames (ingredients), middle frames (cooking), late frames (plating)
 */
export async function extractFramesFromStream(streamUrl: string, maxFrames: number): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    const frames: Buffer[] = [];
    
    // Calculate strategic frame times: beginning, middle sections, end
    const frameTimestamps = generateCookingTimestamps(maxFrames);
    
    const ffmpegProcess = spawn('ffmpeg', [
      '-i', streamUrl,
      '-vf', `select='${frameTimestamps.map((t, i) => `gte(t,${t})`).join('+')}',fps=1`,
      '-frames:v', maxFrames.toString(),
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-y',
      'pipe:1'
    ]);

    let currentBuffer = Buffer.alloc(0);
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    ffmpegProcess.stdout.on('data', (chunk) => {
      currentBuffer = Buffer.concat([currentBuffer, chunk]);
      
      // Parse PNG frames from buffer
      let startIndex = 0;
      while (true) {
        const headerIndex = currentBuffer.indexOf(pngHeader, startIndex);
        if (headerIndex === -1) break;
        
        if (headerIndex > startIndex) {
          const frameBuffer = currentBuffer.slice(startIndex, headerIndex);
          if (frameBuffer.length > 1000) { // Valid frame size check
            frames.push(frameBuffer);
          }
        }
        startIndex = headerIndex;
        
        const nextHeaderIndex = currentBuffer.indexOf(pngHeader, startIndex + pngHeader.length);
        if (nextHeaderIndex === -1) {
          currentBuffer = currentBuffer.slice(startIndex);
          break;
        }
      }
    });

    ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Error')) {
        console.error('FFmpeg error:', output);
      }
    });

    ffmpegProcess.on('close', (code) => {
      // Handle final frame in buffer
      if (currentBuffer.length > 1000) {
        const pngHeaderIndex = currentBuffer.indexOf(pngHeader);
        if (pngHeaderIndex === 0) {
          frames.push(currentBuffer);
        }
      }
      
      if (frames.length > 0) {
        resolve(frames);
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}, no valid frames extracted`));
      }
    });

    ffmpegProcess.on('error', (error) => {
      reject(new Error(`Failed to spawn FFmpeg: ${error.message}`));
    });

    // Timeout after 5 minutes - allow plenty of time for quality frame extraction
    setTimeout(() => {
      ffmpegProcess.kill('SIGTERM');
      if (frames.length > 0) {
        resolve(frames);
      } else {
        reject(new Error('Frame extraction timeout - no frames captured'));
      }
    }, 300000); // 5 minutes
  });
}

/**
 * Get video duration using FFprobe
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      videoPath
    ]);

    let output = '';
    let errorOutput = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0 && output.trim()) {
        const duration = parseFloat(output.trim());
        resolve(Math.floor(duration)); // Return duration in seconds
      } else {
        resolve(60); // Default to 60 seconds if we can't get duration
      }
    });

    ffprobe.on('error', (error) => {
      resolve(60); // Default to 60 seconds
    });
  });
}

/**
 * Generate adaptive timestamps based on video duration
 * ≤1 minute: Every 2 seconds for comprehensive coverage (up to ~30 frames)
 * 1-3 minutes: Enhanced timing with 7s start, 5s middle, 7s end
 * 3-5 minutes: Every 10 seconds with enhanced start/end coverage
 */
function generateAdaptiveTimestamps(durationSeconds: number): number[] {
  const timestamps: number[] = [];
  
  if (durationSeconds <= 60) {
    // ≤1 minute: Every 2 seconds for comprehensive coverage (up to ~30 frames)
    for (let t = 1; t < durationSeconds; t += 2) {
      timestamps.push(t);
    }
  } else if (durationSeconds <= 180) {
    // 1-3 minutes: Enhanced timing with 7s start, 5s middle, 7s end
    
    // Start section (first 30s): every 7 seconds
    for (let t = 3; t <= 30 && t < durationSeconds; t += 7) {
      timestamps.push(t);
    }
    
    // Middle section (bulk): every 5 seconds
    for (let t = 35; t < durationSeconds - 30; t += 5) {
      timestamps.push(t);
    }
    
    // End section (last 30s): every 7 seconds
    const endStart = Math.max(durationSeconds - 30, 35);
    for (let t = endStart; t < durationSeconds - 5; t += 7) {
      if (!timestamps.includes(t)) { // Avoid duplicates
        timestamps.push(t);
      }
    }
  } else if (durationSeconds <= 300) {
    // 3-5 minutes: Every 10 seconds with enhanced start/end coverage
    
    // Early section (first 30s): every 5 seconds
    for (let t = 2; t <= 30 && t < durationSeconds; t += 5) {
      timestamps.push(t);
    }
    
    // Middle section (bulk): every 10 seconds
    for (let t = 40; t < durationSeconds - 30; t += 10) {
      timestamps.push(t);
    }
    
    // Final section (last 30s): every 5 seconds
    const finalStart = Math.max(durationSeconds - 30, 40);
    for (let t = finalStart; t < durationSeconds - 5; t += 5) {
      if (!timestamps.includes(t)) { // Avoid duplicates
        timestamps.push(t);
      }
    }
  } else {
    // 5+ minutes: Every 15 seconds (up to ~20 frames, max cooking video length)
    for (let t = 5; t < Math.min(durationSeconds, 300); t += 15) {
      timestamps.push(t);
    }
  }
  
  // Ensure we don't exceed video length and sort
  const validTimestamps = timestamps
    .filter(t => t < durationSeconds - 2) // Leave 2s buffer at end
    .sort((a, b) => a - b);
    
  return validTimestamps;
}

/**
 * Legacy function - now replaced by adaptive timestamps
 */
function generateCookingTimestamps(numFrames: number): number[] {
  const timestamps: number[] = [];
  
  
  if (numFrames <= 3) {
    // For few frames: beginning, middle, end
    timestamps.push(2, 15, 30); // 2s, 15s, 30s
  } else if (numFrames <= 6) {
    // For moderate frames: spread across cooking stages
    timestamps.push(1, 5, 10, 20, 35, 45); // Strategic cooking moments
  } else {
    // For comprehensive analysis: cover full cooking journey
    timestamps.push(1, 3, 7, 12, 18, 25, 35, 50); // Detailed coverage
  }
  
  const finalTimestamps = timestamps.slice(0, numFrames);
  return finalTimestamps;
}

/**
 * Analyze video frames using OpenAI Vision API for cooking content
 * Identifies ingredients, cooking actions, techniques, and instructions
 */
export async function analyzeFramesWithVision(frames: Buffer[]): Promise<string[]> {
  const results: string[] = [];
  
  // Process frames in batches to avoid rate limiting
  const BATCH_SIZE = 3; // Analyze 3 frames at a time for better rate limiting
  const BATCH_DELAY = 1000; // 1 second delay between batches
  const RETRY_DELAY = 3000; // 3 second delay for rate limit retries (more conservative)
  const MAX_RETRIES = 5; // More retry attempts for reliability
  
  for (let batchStart = 0; batchStart < frames.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, frames.length);
    const batchFrames = frames.slice(batchStart, batchEnd);
    
    
    // Process frames in current batch with small delays
    for (let i = 0; i < batchFrames.length; i++) {
      const globalIndex = batchStart + i;
      let retryCount = 0;
      let analysis = '';
      
      // Retry loop for rate limiting
      while (retryCount <= MAX_RETRIES) {
        try {
          if (retryCount === 0) {
          } else {
          }
          
          // Convert frame to base64 for Vision API
          const base64Frame = batchFrames[i].toString('base64');
          
          // Analyze frame with OpenAI Vision (now focused on observations only)
          analysis = await analyzeFrameWithOpenAI(base64Frame, globalIndex);
          
          // Success - break out of retry loop
          break;
          
        } catch (error: any) {
          // Check if it's a rate limit error
          if (error?.status === 429 && retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            retryCount++;
          } else {
            console.error(`❌ Failed to analyze frame ${globalIndex + 1} after ${retryCount + 1} attempts:`, error);
            break; // Exit retry loop on non-rate-limit errors or max retries reached
          }
        }
      }
      
      // Add analysis if we got one
      if (analysis.trim()) {
        results.push(analysis);
      }
      
      // Small delay between individual frame analyses (only if not the last frame in batch)
      if (i < batchFrames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay
      }
    }
    
    // Longer delay between batches to ensure we don't hit rate limits
    if (batchEnd < frames.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }
  
  return results;
}

/**
 * Analyze a single frame using OpenAI Vision API for cooking content
 * Now focused on OBSERVATIONS only, not recipe extraction
 */
async function analyzeFrameWithOpenAI(base64Frame: string, frameIndex: number): Promise<string> {
  const OpenAI = require('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'missing',
  });

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required for video analysis');
  }

  const frameStage = getFrameStage(frameIndex);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are analyzing a single frame from a cooking video. This frame represents the ${frameStage} stage.

IMPORTANT: Only describe what you SEE in this frame. Do NOT try to create a complete recipe or make assumptions about other frames.

INGREDIENT IDENTIFICATION GUIDELINES:
- Be precise and accurate - only identify ingredients you can clearly see
- Look for package labels or text that can help identify specific ingredients
- If unsure about specific ingredients, describe what you see rather than guessing
- Pay attention to size, color, and shape to distinguish between similar ingredients
- Note any visible brands or product names
- Do NOT assume ingredients that aren't clearly visible

Describe this frame using this format:

OBSERVATIONS:
- What ingredients are visible? (list with estimated quantities if clear, be specific and accurate)
- What cooking action is happening? (chopping, searing, mixing, etc.)
- What tools/equipment are being used?
- What's the state of the food? (raw, cooking, cooked, plated)
- Any text overlays, package labels, or measurements visible?

Keep your response concise and factual. Focus only on what is clearly visible in THIS specific frame.

If no cooking content is visible, simply respond: "No cooking content visible."`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64Frame}`,
            },
          },
        ],
      },
    ],
    max_tokens: 300, // Reduced since we're just observing, not extracting recipes
    temperature: 0.2, // Even lower temperature for consistent observations
  });

  return response.choices[0].message.content || '';
}

/**
 * Determine what stage of cooking this frame likely represents
 */
function getFrameStage(frameIndex: number): string {
  if (frameIndex === 0) return 'ingredient preparation';
  if (frameIndex <= 2) return 'early cooking';
  if (frameIndex >= 4) return 'final dish/plating';
  return 'mid cooking';
}

/**
 * Combine vision analysis results into coherent recipe text
 * Updated to create a consolidated narrative for final recipe extraction
 */
function combineVisionAnalysis(analysisResults: string[]): string {
  if (analysisResults.length === 0) {
    return 'No cooking content detected in video frames.';
  }

  // Filter out empty or non-cooking content
  const validAnalyses = analysisResults.filter(result => 
    result.trim() && 
    !result.toLowerCase().includes('no cooking content') &&
    !result.toLowerCase().includes('not visible') &&
    result.length > 10
  );

  if (validAnalyses.length === 0) {
    return 'Video does not appear to contain clear cooking instructions or ingredient information.';
  }

  // Create a chronological narrative of the cooking process
  const consolidatedNarrative = `COOKING VIDEO ANALYSIS - FRAME BY FRAME OBSERVATIONS:

This is a comprehensive analysis of ${validAnalyses.length} frames from a cooking video, presented in chronological order:

${validAnalyses.map((analysis, index) => 
  `FRAME ${index + 1} (timestamp ~${Math.round((index / validAnalyses.length) * 60)}s):
${analysis}`
).join('\n\n')}

CONSOLIDATION NOTE: These are observations from different moments in the same cooking video. Some ingredients or cooking actions may appear multiple times as the cooking progresses. Please consolidate duplicate ingredients and create a coherent recipe flow from these sequential observations.`;

  return consolidatedNarrative;
}

/**
 * Legacy OCR function - kept as fallback for text overlays
 * Use this when frames contain visible text (measurements, instructions, etc.)
 */
export async function extractTextWithOCR(frames: Buffer[]): Promise<string> {
  // Implementation kept for text overlay detection
  // This would run Tesseract OCR on frames that might contain text
  return 'OCR analysis not implemented yet - use vision analysis instead';
} 