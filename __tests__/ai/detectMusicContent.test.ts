import { detectMusicContent } from '../../lib/ai/detectMusicContent';

// Use the global OpenAI mock from jest.setup.js
const mockOpenAI = require('openai').default;

describe('detectMusicContent', () => {
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mocked create function from the global mock
    mockCreate = mockOpenAI().chat.completions.create;
  });

  it('should detect cooking content', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'false'
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const cookingTranscript = 'First, preheat your oven to 350 degrees. Mix 2 cups of flour with 1 teaspoon of baking powder. Add eggs and milk to create a smooth batter.';
    const result = await detectMusicContent(cookingTranscript);

    expect(result).toBe(false);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-3.5-turbo',
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining(cookingTranscript)
        })
      ]),
      temperature: 0
    });
  });

  it('should detect music content', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'true'
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const musicTranscript = 'Yeah, yeah, oh baby, this beat is fire, dancing all night long, music music music';
    const result = await detectMusicContent(musicTranscript);

    expect(result).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should detect instrumental music', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'true'
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const instrumentalTranscript = '[Music] [Music] [Applause] [Music]';
    const result = await detectMusicContent(instrumentalTranscript);

    expect(result).toBe(true);
  });

  it('should handle ambiguous content', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'true'
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const ambiguousTranscript = 'This video is about cooking but also has background music playing';
    const result = await detectMusicContent(ambiguousTranscript);

    expect(result).toBe(true);
  });

  it('should handle empty transcript', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'true'
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const result = await detectMusicContent('');

    expect(result).toBe(true);
  });

  it('should handle cooking with background music mentions', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'false'
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const transcript = 'While the music plays in the background, let me show you how to make pasta. First, boil water and add salt.';
    const result = await detectMusicContent(transcript);

    expect(result).toBe(false);
  });

  it('should handle OpenAI API errors', async () => {
    mockCreate.mockRejectedValue(new Error('Rate limit exceeded'));

    const result = await detectMusicContent('test transcript');
    
    // Should return false (default) when API fails
    expect(result).toBe(false);
  });

  it('should handle unexpected response format', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'UNEXPECTED RESPONSE'
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const result = await detectMusicContent('test transcript');

    // Should return false for unexpected responses
    expect(result).toBe(false);
  });

  it('should handle recipe with measurements and instructions', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'false'
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const recipeTranscript = 'Take 2 tablespoons of olive oil, heat it in a pan. Add minced garlic and cook for 30 seconds. Season with salt and pepper to taste.';
    const result = await detectMusicContent(recipeTranscript);

    expect(result).toBe(false);
  });
}); 