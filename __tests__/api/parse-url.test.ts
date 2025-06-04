/**
 * @jest-environment node
 */

import { POST } from '@/app/api/parse-url/route'

// Mock the dependencies
jest.mock('../../lib/parser/youtube', () => ({
  getYoutubeCaptions: jest.fn()
}))

jest.mock('../../lib/ai/cleanCaption', () => ({
  cleanCaption: jest.fn()
}))

jest.mock('../../lib/ai/extractFromCaption', () => ({
  extractRecipeFromCaption: jest.fn()
}))

import { getYoutubeCaptions } from '../../lib/parser/youtube'
import { cleanCaption } from '../../lib/ai/cleanCaption'
import { extractRecipeFromCaption } from '../../lib/ai/extractFromCaption'

const mockGetYoutubeCaptions = getYoutubeCaptions as jest.MockedFunction<typeof getYoutubeCaptions>
const mockCleanCaption = cleanCaption as jest.MockedFunction<typeof cleanCaption>
const mockExtractRecipeFromCaption = extractRecipeFromCaption as jest.MockedFunction<typeof extractRecipeFromCaption>

// Create a mock request helper
function createMockRequest(body: any) {
  return {
    json: jest.fn().mockResolvedValue(body)
  } as any
}

describe('/api/parse-url', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('successfully extracts recipe from YouTube URL', async () => {
    const request = createMockRequest({ url: 'https://youtube.com/watch?v=test' })

    mockGetYoutubeCaptions.mockResolvedValue('Raw caption text')
    mockCleanCaption.mockResolvedValue('Cleaned caption text')
    mockExtractRecipeFromCaption.mockResolvedValue({
      ingredients: ['2 eggs', '1 cup flour'],
      instructions: ['Beat eggs', 'Mix flour']
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      platform: 'YouTube',
      ingredients: ['2 eggs', '1 cup flour'],
      instructions: ['Beat eggs', 'Mix flour'],
      source: 'captions'
    })
  })

  test('returns needAudio flag when no ingredients found', async () => {
    const request = createMockRequest({ url: 'https://youtube.com/watch?v=test' })

    mockGetYoutubeCaptions.mockResolvedValue('Raw caption text')
    mockCleanCaption.mockResolvedValue('Cleaned caption text') 
    mockExtractRecipeFromCaption.mockResolvedValue({
      ingredients: [],
      instructions: []
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      platform: 'YouTube',
      needAudio: true,
      url: 'https://youtube.com/watch?v=test',
      message: 'No recipe found in captions/description. Audio transcription needed.',
      source: 'captions_failed'
    })
  })

  test('handles invalid URL', async () => {
    const request = createMockRequest({ url: 'invalid-url' })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Unsupported platform')
  })

  test('handles missing URL', async () => {
    const request = createMockRequest({})

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('URL is required')
  })

  test('handles caption extraction error', async () => {
    const request = createMockRequest({ url: 'https://youtube.com/watch?v=test' })

    mockGetYoutubeCaptions.mockRejectedValue(new Error('Caption extraction failed'))

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Failed to get recipe from link: Caption extraction failed')
  })

  test('handles general parsing error', async () => {
    const request = createMockRequest({ url: 'https://youtube.com/watch?v=test' })

    mockGetYoutubeCaptions.mockResolvedValue('Raw caption text')
    mockCleanCaption.mockRejectedValue(new Error('AI service unavailable'))

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to parse URL')
  })
})