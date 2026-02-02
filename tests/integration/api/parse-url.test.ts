// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/parse-url/route'
import { getTiktokCaptions } from '@acme/core/parsers/tiktok'
import { cleanCaption } from '@acme/core/ai/cleanCaption'
import { extractRecipeFromCaption } from '@acme/core/ai/extractFromCaption'
import { normalizeIngredientsWithAIBatch } from '@acme/core/ai/ingredient-normalizer'
import { getThumbnailUrl } from '@acme/core/utils/thumbnailExtractor'
import { generateRecipeTitle } from '@acme/core/utils/titleGenerator'
import { fetchAudio } from '@acme/core/parsers/audio'
import { transcribeAudio } from '@acme/core/ai/transcribeAudio'
import { detectMusicContent } from '@acme/core/ai/detectMusicContent'
import { extractRecipeFromTranscript } from '@acme/core/ai/extractFromTranscript'

vi.mock('@acme/core/parsers/tiktok', () => ({
  getTiktokCaptions: vi.fn(),
}))

vi.mock('@acme/core/parsers/youtube', () => ({
  getYoutubeCaptions: vi.fn(),
}))

vi.mock('@acme/core/parsers/instagram', () => ({
  getInstagramCaptions: vi.fn(),
}))

vi.mock('@acme/core/parsers/cooking-website', () => ({
  getCookingWebsiteData: vi.fn(),
}))

vi.mock('@acme/core/parsers/pinterest', () => ({
  getPinterestSourceUrl: vi.fn(),
  isLikelyCookingWebsite: vi.fn(),
}))

vi.mock('@acme/core/parsers/facebook', () => ({
  getFacebookCaptions: vi.fn(),
}))

vi.mock('@acme/core/ai/cleanCaption', () => ({
  cleanCaption: vi.fn(),
}))

vi.mock('@acme/core/ai/extractFromCaption', () => ({
  extractRecipeFromCaption: vi.fn(),
}))

vi.mock('@acme/core/ai/ingredient-normalizer', () => ({
  normalizeIngredientsWithAIBatch: vi.fn(),
}))

vi.mock('@acme/core/utils/thumbnailExtractor', () => ({
  getThumbnailUrl: vi.fn(),
}))

vi.mock('@acme/core/utils/titleGenerator', () => ({
  generateRecipeTitle: vi.fn(),
}))

vi.mock('@acme/core/parsers/audio', () => ({
  fetchAudio: vi.fn(),
}))

vi.mock('@acme/core/ai/transcribeAudio', () => ({
  transcribeAudio: vi.fn(),
}))

vi.mock('@acme/core/ai/detectMusicContent', () => ({
  detectMusicContent: vi.fn(),
}))

vi.mock('@acme/core/ai/extractFromTranscript', () => ({
  extractRecipeFromTranscript: vi.fn(),
}))

const mockGetTiktokCaptions = vi.mocked(getTiktokCaptions)
const mockCleanCaption = vi.mocked(cleanCaption)
const mockExtractRecipeFromCaption = vi.mocked(extractRecipeFromCaption)
const mockNormalizeIngredientsWithAIBatch = vi.mocked(normalizeIngredientsWithAIBatch)
const mockGetThumbnailUrl = vi.mocked(getThumbnailUrl)
const mockGenerateRecipeTitle = vi.mocked(generateRecipeTitle)
const mockFetchAudio = vi.mocked(fetchAudio)
const mockTranscribeAudio = vi.mocked(transcribeAudio)
const mockDetectMusicContent = vi.mocked(detectMusicContent)
const mockExtractRecipeFromTranscript = vi.mocked(extractRecipeFromTranscript)

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/parse-url', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function normalizeFromInputs(inputs: string[]) {
  return inputs.map((input) => {
    const match = input.match(/^(\d+(?:\.\d+)?)\s+(\w+)\s+(.+)$/)
    if (match) {
      return {
        quantity: Number(match[1]),
        unit: match[2],
        ingredient: match[3],
        original: input,
        confidence: 0.9,
      }
    }

    return {
      quantity: 1,
      unit: undefined,
      ingredient: input,
      original: input,
      confidence: 0.9,
    }
  })
}

describe('/api/parse-url', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetThumbnailUrl.mockResolvedValue('')
    mockGenerateRecipeTitle.mockResolvedValue('Mock Recipe Title')
  })

  it('returns 400 when URL is missing', async () => {
    const response = await POST(makeRequest({}))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('URL is required')
  })

  it('returns recipe from captions for TikTok URLs', async () => {
    const ingredients = ['2 cups flour', '3 eggs', '1 cup sugar']
    const instructions = ['Mix dry ingredients', 'Bake at 350°F']

    mockGetTiktokCaptions.mockResolvedValue(
      'Amazing chocolate chip cookie recipe! Mix flour, eggs, and sugar...'
    )
    mockCleanCaption.mockResolvedValue(
      'Amazing chocolate chip cookie recipe! Mix flour, eggs, and sugar...'
    )
    mockExtractRecipeFromCaption.mockResolvedValue({ ingredients, instructions })
    mockNormalizeIngredientsWithAIBatch.mockResolvedValue(
      normalizeFromInputs(ingredients)
    )

    const response = await POST(
      makeRequest({ url: 'https://www.tiktok.com/@chef/video/1234567890' })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.platform).toBe('TikTok')
    expect(data.source).toBe('captions')
    expect(data.ingredients).toHaveLength(3)
    expect(data.instructions).toHaveLength(2)
    expect(mockGetTiktokCaptions).toHaveBeenCalled()
    expect(mockExtractRecipeFromCaption).toHaveBeenCalled()
  })

  it('returns needsFullAnalysis in fast mode when captions are empty', async () => {
    mockGetTiktokCaptions.mockResolvedValue('')
    mockCleanCaption.mockResolvedValue('')
    mockExtractRecipeFromCaption.mockResolvedValue({
      ingredients: [],
      instructions: [],
    })

    const response = await POST(
      makeRequest({
        url: 'https://www.tiktok.com/@chef/video/1234567890',
        mode: 'fast',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.needsFullAnalysis).toBe(true)
    expect(data.source).toBe('captions_only')
    expect(mockFetchAudio).not.toHaveBeenCalled()
  })

  it('falls back to audio transcript when captions fail', async () => {
    const ingredients = ['2 cups flour', '3 eggs', '1 cup sugar']
    const instructions = ['Mix flour with eggs', 'Add sugar']

    mockGetTiktokCaptions.mockResolvedValue('')
    mockCleanCaption.mockResolvedValue('')
    mockExtractRecipeFromCaption.mockResolvedValue({
      ingredients: [],
      instructions: [],
    })
    mockFetchAudio.mockResolvedValue(new Blob(['audio'], { type: 'audio/mpeg' }))
    mockTranscribeAudio.mockResolvedValue(
      'Mix 2 cups flour with 3 eggs and 1 cup sugar...'
    )
    mockDetectMusicContent.mockResolvedValue(false)
    mockExtractRecipeFromTranscript.mockResolvedValue({
      ingredients,
      instructions,
    })
    mockNormalizeIngredientsWithAIBatch.mockResolvedValue(
      normalizeFromInputs(ingredients)
    )

    const response = await POST(
      makeRequest({ url: 'https://www.tiktok.com/@chef/video/1234567890' })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.source).toBe('audio_transcript')
    expect(data.ingredients).toHaveLength(3)
    expect(data.instructions).toHaveLength(2)
    expect(mockFetchAudio).toHaveBeenCalled()
    expect(mockExtractRecipeFromTranscript).toHaveBeenCalled()
  })
})
