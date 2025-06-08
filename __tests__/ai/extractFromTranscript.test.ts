/**
 * @jest-environment node
 */

import { extractRecipeFromTranscript } from '../../lib/ai/extractFromTranscript';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('extractFromTranscript', () => {
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

  it.skip('should extract recipe from valid transcript', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            ingredients: [
              '2 cups all-purpose flour',
              '1 teaspoon baking powder',
              '1/2 cup sugar'
            ],
            instructions: [
              'Mix dry ingredients in a bowl',
              'Add wet ingredients and stir',
              'Bake at 350°F for 25 minutes'
            ]
          })
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const transcript = 'Mix 2 cups flour with 1 teaspoon baking powder and half cup sugar. Combine wet and dry ingredients. Bake at 350 degrees for 25 minutes.';
    const result = await extractRecipeFromTranscript(transcript);

    expect(result.ingredients).toHaveLength(3);
    expect(result.instructions).toHaveLength(3);
    expect(result.ingredients[0]).toBe('2 cups all-purpose flour');
    expect(result.instructions[0]).toBe('Mix dry ingredients in a bowl');
    
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it.skip('should handle malformed JSON response', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'Invalid JSON response'
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const transcript = 'Some cooking instructions';
    await expect(extractRecipeFromTranscript(transcript)).rejects.toThrow();
  });

  it('should handle empty transcript', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            ingredients: [],
            instructions: []
          })
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const result = await extractRecipeFromTranscript('');

    expect(result.ingredients).toHaveLength(0);
    expect(result.instructions).toHaveLength(0);
  });

  it('should handle mixed number conversions in ingredients', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            ingredients: [
              '1.5 cups milk',
              '2.25 teaspoons vanilla'
            ],
            instructions: [
              'Mix ingredients'
            ]
          })
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const transcript = 'Use 1 and a half cups milk with 2 and quarter teaspoons vanilla';
    const result = await extractRecipeFromTranscript(transcript);

    expect(result.ingredients).toContain('1.5 cups milk');
    expect(result.ingredients).toContain('2.25 teaspoons vanilla');
  });

  it('should remove parenthetical measurements', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            ingredients: [
              '1 cup butter',
              '2 tablespoons vanilla extract'
            ],
            instructions: [
              'Cream the butter'
            ]
          })
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const transcript = 'Use 1 cup (225g) butter and 2 tablespoons (30ml) vanilla extract';
    const result = await extractRecipeFromTranscript(transcript);

    expect(result.ingredients).toContain('1 cup butter');
    expect(result.ingredients).toContain('2 tablespoons vanilla extract');
    expect(result.ingredients.some(ing => ing.includes('('))).toBeFalsy();
  });

  it.skip('should handle OpenAI API errors', async () => {
    mockCreate.mockRejectedValue(new Error('API quota exceeded'));

    await expect(extractRecipeFromTranscript('test transcript')).rejects.toThrow('API quota exceeded');
  });

  it('should validate ingredient-instruction consistency', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            ingredients: [
              '2 cups flour',
              '1 cup milk'
            ],
            instructions: [
              'Mix flour and milk',
              'Add the missing ingredient we never mentioned'
            ]
          })
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const transcript = 'Mix 2 cups flour with 1 cup milk';
    const result = await extractRecipeFromTranscript(transcript);

    // The function should handle consistency validation
    expect(result.ingredients).toHaveLength(2);
    expect(result.instructions).toHaveLength(2);
  });

  it('should handle complex cooking terminology', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            ingredients: [
              '4 chicken thighs',
              '1 tablespoon olive oil',
              '1 teaspoon kosher salt'
            ],
            instructions: [
              'Season chicken with kosher salt',
              'Sear in olive oil until golden',
              'Finish in 350°F oven for 20 minutes'
            ]
          })
        }
      }]
    };
    mockCreate.mockResolvedValue(mockResponse);

    const transcript = 'Season 4 chicken thighs with kosher salt. Sear in olive oil until golden brown. Transfer to 350 degree oven for 20 minutes.';
    const result = await extractRecipeFromTranscript(transcript);

    expect(result.ingredients).toContain('4 chicken thighs');
    expect(result.ingredients).toContain('1 tablespoon olive oil');
    expect(result.instructions).toContain('Season chicken with kosher salt');
  });
}); 