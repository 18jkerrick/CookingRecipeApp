/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/parse-url/route';

// Mock all external dependencies
jest.mock('@/lib/parsers/tiktok');
jest.mock('@/lib/parsers/youtube');
jest.mock('@/lib/parsers/cooking-website');
jest.mock('@/lib/parsers/audio');
jest.mock('@/lib/parsers/video');
jest.mock('@/lib/ai/cleanCaption');
jest.mock('@/lib/ai/extractFromCaption');
jest.mock('@/lib/ai/extractFromTranscript');
jest.mock('@/lib/ai/transcribeAudio');
jest.mock('@/lib/ai/detectMusicContent');

import { getTiktokCaptions } from '@/lib/parsers/tiktok';
import { getYoutubeCaptions } from '@/lib/parsers/youtube';
import { getCookingWebsiteData } from '@/lib/parsers/cooking-website';
import { fetchAudio } from '@/lib/parsers/audio';
import { extractTextFromVideo } from '@/lib/parsers/video';
import { cleanCaption } from '@/lib/ai/cleanCaption';
import { extractRecipeFromCaption } from '@/lib/ai/extractFromCaption';
import { extractRecipeFromTranscript } from '@/lib/ai/extractFromTranscript';
import { transcribeAudio } from '@/lib/ai/transcribeAudio';
import { detectMusicContent } from '@/lib/ai/detectMusicContent';

const mockGetTiktokCaptions = getTiktokCaptions as jest.MockedFunction<typeof getTiktokCaptions>;
const mockGetYoutubeCaptions = getYoutubeCaptions as jest.MockedFunction<typeof getYoutubeCaptions>;
const mockGetCookingWebsiteData = getCookingWebsiteData as jest.MockedFunction<typeof getCookingWebsiteData>;
const mockFetchAudio = fetchAudio as jest.MockedFunction<typeof fetchAudio>;
const mockExtractTextFromVideo = extractTextFromVideo as jest.MockedFunction<typeof extractTextFromVideo>;
const mockCleanCaption = cleanCaption as jest.MockedFunction<typeof cleanCaption>;
const mockExtractRecipeFromCaption = extractRecipeFromCaption as jest.MockedFunction<typeof extractRecipeFromCaption>;
const mockExtractRecipeFromTranscript = extractRecipeFromTranscript as jest.MockedFunction<typeof extractRecipeFromTranscript>;
const mockTranscribeAudio = transcribeAudio as jest.MockedFunction<typeof transcribeAudio>;
const mockDetectMusicContent = detectMusicContent as jest.MockedFunction<typeof detectMusicContent>;

describe('/api/parse-url', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should extract recipe from TikTok video via captions', async () => {
    // Mock TikTok caption extraction
    mockGetTiktokCaptions.mockResolvedValue('Amazing chocolate chip cookie recipe! Mix flour, eggs, and sugar...');
    
    // Mock caption cleaning
    mockCleanCaption.mockResolvedValue('Amazing chocolate chip cookie recipe! Mix flour, eggs, and sugar...');
    
    // Mock recipe extraction from caption
    mockExtractRecipeFromCaption.mockResolvedValue({
      ingredients: ['2 cups flour', '3 eggs', '1 cup sugar'],
      instructions: ['Mix dry ingredients', 'Add wet ingredients', 'Bake at 350°F']
    });

    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://www.tiktok.com/@chef/video/1234567890'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ingredients).toHaveLength(3);
    expect(data.instructions).toHaveLength(3);
    expect(data.ingredients[0]).toBe('2 cups flour');
    expect(data.instructions[0]).toBe('Mix dry ingredients');
    expect(data.source).toBe('captions');
    
    expect(mockGetTiktokCaptions).toHaveBeenCalledWith('https://www.tiktok.com/@chef/video/1234567890');
    expect(mockCleanCaption).toHaveBeenCalled();
    expect(mockExtractRecipeFromCaption).toHaveBeenCalled();
  });

  it('should fallback to audio extraction when captions fail', async () => {
    // Mock TikTok caption extraction with empty result
    mockGetTiktokCaptions.mockResolvedValue('');
    mockCleanCaption.mockResolvedValue('');
    mockExtractRecipeFromCaption.mockResolvedValue({ ingredients: [], instructions: [] });
    
    // Mock successful audio extraction
    const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/mpeg' });
    mockFetchAudio.mockResolvedValue(mockAudioBlob);
    mockTranscribeAudio.mockResolvedValue('Mix 2 cups flour with 3 eggs and 1 cup sugar...');
    mockDetectMusicContent.mockResolvedValue(false);
    
    // Mock recipe extraction from transcript
    mockExtractRecipeFromTranscript.mockResolvedValue({
      ingredients: ['2 cups flour', '3 eggs', '1 cup sugar'],
      instructions: ['Mix flour with eggs', 'Add sugar', 'Bake at 350°F']
    });

    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://www.tiktok.com/@chef/video/1234567890'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ingredients).toHaveLength(3);
    expect(data.instructions).toHaveLength(3);
    expect(data.source).toBe('audio_transcript');
    
    expect(mockFetchAudio).toHaveBeenCalled();
    expect(mockTranscribeAudio).toHaveBeenCalled();
    expect(mockExtractRecipeFromTranscript).toHaveBeenCalled();
  });

  it('should handle YouTube URLs', async () => {
    // Mock YouTube caption extraction
    mockGetYoutubeCaptions.mockResolvedValue('Easy pasta recipe! Boil water, add pasta, make sauce...');
    mockCleanCaption.mockResolvedValue('Easy pasta recipe! Boil water, add pasta, make sauce...');
    mockExtractRecipeFromCaption.mockResolvedValue({
      ingredients: ['1 pound pasta', '2 cups sauce', '1 cup cheese'],
      instructions: ['Boil water', 'Cook pasta', 'Add sauce']
    });

    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ingredients).toHaveLength(3);
    expect(data.platform).toBe('YouTube');
    expect(mockGetYoutubeCaptions).toHaveBeenCalled();
  });

  it('should return error for invalid cooking website URL', async () => {
    // Mock a non-cooking website that will fail validation
    mockGetCookingWebsiteData.mockRejectedValue(new Error('Not a valid cooking website URL'));

    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://invalid-url.com'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Failed to get recipe from cooking website');
  });

  it('should handle missing URL in request', async () => {
    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('URL is required');
  });

  it('should handle cooking website URLs', async () => {
    mockGetCookingWebsiteData.mockResolvedValue({
      extractedText: 'Recipe: Nutella Cookies\n\nIngredients:\n- 2 cups flour\n- 1/2 cup butter\n- 1/2 cup Nutella\n\nInstructions:\n1. Mix ingredients\n2. Bake at 350°F',
      title: 'Nutella Cookies',
      thumbnail: 'https://example.com/nutella-cookies.jpg',
      bypassAI: false
    });
    mockCleanCaption.mockResolvedValue('Recipe: Nutella Cookies. Ingredients: 2 cups flour, 1/2 cup butter, 1/2 cup Nutella. Instructions: Mix ingredients, Bake at 350°F');
    mockExtractRecipeFromCaption.mockResolvedValue({
      ingredients: ['2 cups flour', '1/2 cup butter', '1/2 cup Nutella'],
      instructions: ['Mix ingredients', 'Bake at 350°F for 12 minutes']
    });

    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://sugarspunrun.com/nutella-cookies/'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ingredients).toHaveLength(3);
    expect(data.platform).toBe('Cooking Website');
    expect(data.ingredients).toContain('2 cups flour');
    expect(mockGetCookingWebsiteData).toHaveBeenCalledWith('https://sugarspunrun.com/nutella-cookies/');
  });

  it('should reject invalid cooking websites', async () => {
    mockGetCookingWebsiteData.mockRejectedValue(new Error('Not a valid cooking website URL'));

    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/about-us'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Failed to get recipe from cooking website');
  });

  it('should handle malformed JSON request', async () => {
    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it('should handle fast mode', async () => {
    // Mock caption extraction with no results
    mockGetTiktokCaptions.mockResolvedValue('');
    mockCleanCaption.mockResolvedValue('');
    mockExtractRecipeFromCaption.mockResolvedValue({ ingredients: [], instructions: [] });

    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://www.tiktok.com/@chef/video/1234567890',
        mode: 'fast'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.needsFullAnalysis).toBe(true);
    expect(data.error).toContain('No recipe found in captions');
    
    // Should not call audio or video processing in fast mode
    expect(mockFetchAudio).not.toHaveBeenCalled();
    expect(mockExtractTextFromVideo).not.toHaveBeenCalled();
  });

  it('should fallback to video analysis when audio fails', async () => {
    // Mock caption extraction failure
    mockGetTiktokCaptions.mockResolvedValue('');
    mockCleanCaption.mockResolvedValue('');
    mockExtractRecipeFromCaption.mockResolvedValue({ ingredients: [], instructions: [] });
    
    // Mock audio extraction failure
    mockFetchAudio.mockRejectedValue(new Error('Audio extraction failed'));
    
    // Mock video analysis success
    mockExtractTextFromVideo.mockResolvedValue('Cooking instructions: Mix 2 cups flour with 3 eggs and 1 cup sugar...');
    mockExtractRecipeFromTranscript.mockResolvedValue({
      ingredients: ['2 cups flour', '3 eggs', '1 cup sugar'],
      instructions: ['Mix flour with eggs', 'Add sugar', 'Bake at 350°F']
    });

    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://www.tiktok.com/@chef/video/1234567890'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ingredients).toHaveLength(3);
    expect(data.instructions).toHaveLength(3);
    expect(data.source).toBe('video_analysis_fallback');
    
    expect(mockFetchAudio).toHaveBeenCalled();
    expect(mockExtractTextFromVideo).toHaveBeenCalled();
    expect(mockExtractRecipeFromTranscript).toHaveBeenCalled();
  });
});