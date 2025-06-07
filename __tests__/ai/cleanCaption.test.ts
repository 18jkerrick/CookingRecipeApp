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
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining(messyCaption)
        })
      ]),
      temperature: 0.3
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

  it('should handle OpenAI API errors', async () => {
    mockCreate.mockRejectedValue(new Error('API Error'));

    await expect(cleanCaption('test caption')).rejects.toThrow('API Error');
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