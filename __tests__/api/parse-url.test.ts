import { POST } from '@/app/api/parse-url/route'
import { NextRequest } from 'next/server'

// Mock the dependencies
jest.mock('@/lib/parser/youtube', () => ({
  fetchYouTubeCaption: jest.fn()
}))

jest.mock('@/lib/ai/cleanCaption', () => ({
  cleanCaption: jest.fn()
}))

jest.mock('@/lib/ai/extractFromCaption', () => ({
  extractRecipeFromCaption: jest.fn()
}))

import { fetchYouTubeCaption } from '@/lib/parser/youtube'
import { cleanCaption } from '@/lib/ai/cleanCaption'
import { extractRecipeFromCaption } from '@/lib/ai/extractFromCaption'

const mockFetchYouTubeCaption = fetchYouTubeCaption as jest.MockedFunction<typeof fetchYouTubeCaption>
const mockCleanCaption = cleanCaption as jest.MockedFunction<typeof cleanCaption>
const mockExtractRecipeFromCaption = extractRecipeFromCaption as jest.MockedFunction<typeof extractRecipeFromCaption>

describe('/api/parse-url', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('successfully extracts recipe from YouTube URL', async () => {
    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://youtube.com/watch?v=test' })
    })

    mockFetchYouTubeCaption.mockResolvedValue('Raw caption text')
    mockCleanCaption.mockResolvedValue('Cleaned caption text')
    mockExtractRecipeFromCaption.mockResolvedValue({
      ingredients: ['2 eggs', '1 cup flour'],
      instructions: ['Beat eggs', 'Mix flour']
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      platform: 'youtube',
      ingredients: ['2 eggs', '1 cup flour'],
      instructions: ['Beat eggs', 'Mix flour'],
      source: 'captions'
    })
  })

  test('returns needAudio flag when no ingredients found', async () => {
    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://youtube.com/watch?v=test' })
    })

    mockFetchYouTubeCaption.mockResolvedValue('Raw caption text')
    mockCleanCaption.mockResolvedValue('Cleaned caption text')
    mockExtractRecipeFromCaption.mockResolvedValue({
      ingredients: [],
      instructions: []
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      platform: 'youtube',
      needAudio: true,
      url: 'https://youtube.com/watch?v=test',
      message: 'No recipe found in captions/description. Audio transcription needed.',
      source: 'captions_failed'
    })
  })

  test('handles invalid URL', async () => {
    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({ url: 'invalid-url' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid URL')
  })

  test('handles missing URL', async () => {
    const request = new NextRequest('http://localhost:3000/api/parse-url', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('URL is required')
  })
})