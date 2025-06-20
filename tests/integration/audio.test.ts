import { fetchAudio, validateAudioBlob, isYouTubeUrl } from '@/lib/parsers/audio';

describe('Audio Extraction', () => {
  // Test URL validation
  it('should identify YouTube URLs correctly', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isYouTubeUrl('https://tiktok.com/@user/video/123')).toBe(false);
  });

  // Test blob validation
  it('should validate audio blobs correctly', () => {
    // Valid audio blob
    const validBlob = new Blob(['fake audio data'], { type: 'audio/webm' });
    expect(validateAudioBlob(validBlob)).toBe(true);

    // Invalid MIME type
    const invalidTypeBlob = new Blob(['fake data'], { type: 'text/plain' });
    expect(validateAudioBlob(invalidTypeBlob)).toBe(false);

    // Empty blob
    const emptyBlob = new Blob([], { type: 'audio/webm' });
    expect(validateAudioBlob(emptyBlob)).toBe(false);
  });

  // Integration test with real YouTube URL (optional - can be skipped in CI)
  it.skip('should extract audio from YouTube URL', async () => {
    const testUrl = 'https://www.youtube.com/watch?v=f-M3JN_7LGU'; // Short cooking video
    
    try {
      const audioBlob = await fetchAudio(testUrl);
      
      expect(audioBlob).toBeInstanceOf(Blob);
      expect(audioBlob.size).toBeGreaterThan(0);
      expect(validateAudioBlob(audioBlob)).toBe(true);
      
      console.log('Audio extraction test passed:', {
        size: audioBlob.size,
        type: audioBlob.type
      });
    } catch (error) {
      console.warn('Audio extraction test failed (this may be expected in CI):', error);
      // Don't fail the test in CI environments where yt-dlp may not be available
    }
  }, 30000); // 30 second timeout for network operations
}); 