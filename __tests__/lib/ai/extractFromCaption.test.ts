import { extractRecipeFromCaption } from '@/lib/ai/extractFromCaption'
import OpenAI from 'openai'

// Mock OpenAI
jest.mock('openai')
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

describe('extractRecipeFromCaption', () => {
  let mockCreate: jest.Mock

  beforeEach(() => {
    mockCreate = jest.fn()
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    } as any))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('successfully extracts recipe from caption', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            ingredients: ['2 eggs', '1 cup flour', '1 cup milk'],
            instructions: ['Beat eggs', 'Mix with flour', 'Add milk']
          })
        }
      }]
    }
    
    mockCreate.mockResolvedValue(mockResponse)
    
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
    const mockResponse = {
      choices: [{
        message: {
          content: 'Invalid JSON response'
        }
      }]
    }
    
    mockCreate.mockResolvedValue(mockResponse)
    
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
    const mockResponse = {
      choices: [{
        message: {
          content: null
        }
      }]
    }
    
    mockCreate.mockResolvedValue(mockResponse)
    
    const result = await extractRecipeFromCaption('Some text...')
    
    expect(result).toEqual({
      ingredients: [],
      instructions: []
    })
  })
})