/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../../app/api/parse-url/route';

// Mock all external dependencies
jest.mock('../../lib/parser/tiktok');
jest.mock('../../lib/parser/youtube');
jest.mock('../../lib/parser/audio');
jest.mock('../../lib/ai/cleanCaption');
jest.mock('../../lib/ai/extractFromCaption');
jest.mock('../../lib/ai/extractFromTranscript');

import { getTiktokCaptions } from '../../lib/parser/tiktok';
import { getYoutubeCaptions } from '../../lib/parser/youtube';
import { fetchAudio } from '../../lib/parser/audio';
import { cleanCaption } from '../../lib/ai/cleanCaption';
import { extractRecipeFromCaption } from '../../lib/ai/extractFromCaption';
import { extractRecipeFromTranscript } from '../../lib/ai/extractFromTranscript';

const mockGetTiktokCaptions = getTiktokCaptions as jest.MockedFunction<typeof getTiktokCaptions>;
const mockGetYoutubeCaptions = getYoutubeCaptions as jest.MockedFunction<typeof getYoutubeCaptions>;
const mockFetchAudio = fetchAudio as jest.MockedFunction<typeof fetchAudio>;
const mockCleanCaption = cleanCaption as jest.MockedFunction<typeof cleanCaption>;
const mockExtractRecipeFromCaption = extractRecipeFromCaption as jest.MockedFunction<typeof extractRecipeFromCaption>;
const mockExtractRecipeFromTranscript = extractRecipeFromTranscript as jest.MockedFunction<typeof extractRecipeFromTranscript>;

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
    
    expect(mockGetTiktokCaptions).toHaveBeenCalledWith('https://www.tiktok.com/@chef/video/1234567890');
    expect(mockCleanCaption).toHaveBeenCalled();
    expect(mockExtractRecipeFromCaption).toHaveBeenCalled();
  });

  it('should fallback to audio extraction when captions fail', async () => {
    // Mock TikTok caption extraction failure
    mockGetTiktokCaptions.mockResolvedValue('');
    mockCleanCaption.mockResolvedValue('');
    mockExtractRecipeFromCaption.mockResolvedValue({ ingredients: [], instructions: [] });
    
    // Mock successful audio extraction (fetchAudio returns a Blob)
    const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/mpeg' });
    mockFetchAudio.mockResolvedValue(mockAudioBlob);
    
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
    
    expect(mockFetchAudio).toHaveBeenCalled();
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
    expect(mockGetYoutubeCaptions).toHaveBeenCalled();
  });

  it('should return error for invalid URL', async () => {
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
    expect(data.error).toContain('Unsupported URL');
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

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid JSON');
  });
});