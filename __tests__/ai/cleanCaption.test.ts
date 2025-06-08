import { cleanCaption } from '../../lib/ai/cleanCaption';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('cleanCaption', () => {
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate = jest.fn();
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    } as any));
  });

  it('should clean and normalize messy caption text', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'This is a cleaned recipe caption with proper formatting and grammar.'
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const messyCaption = 'this is A MESSY caption with bad... grammar!!!';
    const result = await cleanCaption(messyCaption);

    expect(result).toBe('This is a cleaned recipe caption with proper formatting and grammar.');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: "system",
          content: `You are a caption cleaning assistant. Your job is to clean and normalize video captions/transcripts by:
          1. Removing timestamp markers like [00:15] or (0:30)
          2. Removing speaker labels like "SPEAKER 1:" or "Host:"
          3. Fixing common transcription errors and typos
          4. Normalizing punctuation and spacing
          5. Keeping all recipe-related content intact
          6. Making the text flow naturally and be easy to read
          
          Return only the cleaned caption text, nothing else.`
        },
        {
          role: "user",
          content: `Please clean this video caption/transcript:\n\n${messyCaption}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });
  });

  it('should handle empty input gracefully', async () => {
    const result = await cleanCaption('');
    
    expect(result).toBe('');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should handle whitespace-only input', async () => {
    const result = await cleanCaption('   \n\t   ');
    
    expect(result).toBe('');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should handle OpenAI API errors with fallback', async () => {
    mockCreate.mockRejectedValue(new Error('API Error'));

    const result = await cleanCaption('test caption');
    
    // Should fall back to basic cleaning instead of throwing
    expect(result).toBe('test caption');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should preserve recipe-related content while cleaning', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'Mix 2 cups flour with 1 egg. Bake at 350°F for 30 minutes.'
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const result = await cleanCaption('MIX 2cups flour with 1 egg... bake at 350f for 30mins!!!');

    expect(result).toBe('Mix 2 cups flour with 1 egg. Bake at 350°F for 30 minutes.');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
}); 