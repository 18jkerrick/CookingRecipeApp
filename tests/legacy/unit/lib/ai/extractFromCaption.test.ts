// Mock OpenAI before importing the function
const mockCreate = jest.fn()
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  }
})

import { extractRecipeFromCaption } from '@acme/core/ai/extractFromCaption'

describe('extractRecipeFromCaption', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('successfully extracts recipe from caption', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            ingredients: ['2 eggs', '1 cup flour', '1 cup milk'],
            instructions: ['Beat eggs', 'Mix with flour', 'Add milk']
          })
        }
      }]
    })

    const result = await extractRecipeFromCaption('Recipe for pancakes...')

    expect(result).toEqual({
      ingredients: ['2 eggs', '1 cup flour', '1 cup milk'],
      instructions: ['Beat eggs', 'Mix with flour', 'Add milk']
    })

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-3.5-turbo',
      messages: expect.any(Array),
      temperature: 0.1,
      max_tokens: 800
    })
  })

  test('handles invalid JSON response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: 'Invalid JSON response'
        }
      }]
    })

    const result = await extractRecipeFromCaption('Some text...')

    expect(result).toEqual({
      ingredients: [],
      instructions: []
    })
  })

  test('handles OpenAI API error', async () => {
    mockCreate.mockRejectedValue(new Error('API Error'))

    const result = await extractRecipeFromCaption('Some text...')

    expect(result).toEqual({
      ingredients: [],
      instructions: []
    })
  })

  test('handles empty response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: null
        }
      }]
    })

    const result = await extractRecipeFromCaption('Some text...')

    expect(result).toEqual({
      ingredients: [],
      instructions: []
    })
  })
})