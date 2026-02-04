import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractVideoTitle } from '@acme/core/utils/titleExtractor'
import { getYoutubeTitle } from '@acme/core/parsers/youtube'
import { getFacebookTitle } from '@acme/core/parsers/facebook'

vi.mock('@acme/core/parsers/youtube', () => ({
  getYoutubeTitle: vi.fn(),
}))

vi.mock('@acme/core/parsers/facebook', () => ({
  getFacebookTitle: vi.fn(),
}))

const mockGetYoutubeTitle = vi.mocked(getYoutubeTitle)
const mockGetFacebookTitle = vi.mocked(getFacebookTitle)

describe('extractVideoTitle', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('uses YouTube metadata title when available', async () => {
    mockGetYoutubeTitle.mockResolvedValue('Amazing Chocolate Chip Cookies')

    const result = await extractVideoTitle(
      'Some captions about cookies',
      'YouTube',
      'https://www.youtube.com/watch?v=123'
    )

    expect(result).toBe('Amazing Chocolate Chip Cookies')
    expect(mockGetYoutubeTitle).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=123'
    )
  })

  it('falls back to caption extraction when YouTube metadata fails', async () => {
    mockGetYoutubeTitle.mockRejectedValue(new Error('YouTube API error'))

    const result = await extractVideoTitle(
      'Amazing Chocolate Chip Cookie Recipe - Easy and delicious cookies',
      'YouTube',
      'https://www.youtube.com/watch?v=123'
    )

    expect(result).toBe(
      'Amazing Chocolate Chip Cookie Recipe'
    )
  })

  it('uses Facebook metadata title when available', async () => {
    mockGetFacebookTitle.mockResolvedValue('Double Chocolate Chip Cookie')

    const result = await extractVideoTitle(
      'Some captions about cookies',
      'Facebook',
      'https://fb.watch/test123/'
    )

    expect(result).toBe('Double Chocolate Chip Cookie')
    expect(mockGetFacebookTitle).toHaveBeenCalledWith(
      'https://fb.watch/test123/'
    )
  })

  it('returns null for captions without a clear recipe title', async () => {
    const result = await extractVideoTitle(
      'Just some random text without any cooking content here',
      'TikTok',
      'https://www.tiktok.com/@chef/video/123'
    )

    expect(result).toBeNull()
  })

  it('does not call metadata extraction for other platforms', async () => {
    const result = await extractVideoTitle(
      'Amazing Cookies Recipe - So good',
      'TikTok',
      'https://www.tiktok.com/@chef/video/123'
    )

    expect(result).toBe('Amazing Cookies Recipe')
    expect(mockGetYoutubeTitle).not.toHaveBeenCalled()
    expect(mockGetFacebookTitle).not.toHaveBeenCalled()
  })

  it('extracts a title from pipe + episode captions', async () => {
    const result = await extractVideoTitle(
      `🇵🇭 Beef Pares Mami | Filipino Food Bible – Episode 2

Beef pares traces its roots to Filipino-Chinese (Fil-Chi) cuisine.`,
      'TikTok',
      'https://www.tiktok.com/@chef/video/456'
    )

    expect(result).toBe('Beef Pares Mami')
  })

  it('selects the dish line when a preamble is present', async () => {
    const result = await extractVideoTitle(
      `what I eat after the gym, pt. 13

crispy chicken w/ creamy miso coconut leeks & beans 🍗🫘`,
      'TikTok',
      'https://www.tiktok.com/@chef/video/789'
    )

    expect(result).toBe('Crispy Chicken W/ Creamy Miso Coconut Leeks & Beans')
  })

  it('cleans emoji-only short titles', async () => {
    const result = await extractVideoTitle(
      'Dumpling lasagna 🥟',
      'TikTok',
      'https://www.tiktok.com/@chef/video/1011'
    )

    expect(result).toBe('Dumpling Lasagna')
  })

  it('handles short title inputs directly', async () => {
    const result = await extractVideoTitle(
      'brothy chicken thighs',
      'TikTok',
      'https://www.tiktok.com/@chef/video/1213'
    )

    expect(result).toBe('Brothy Chicken Thighs')
  })

  it('extracts the dish name from conversational transcripts', async () => {
    const result = await extractVideoTitle(
      "My name's Tag and everyone I know is sick right now. So I wanted to show y' all how to make Filipino chicken adobo the way I do it.",
      'TikTok',
      'https://www.tiktok.com/@chef/video/1415'
    )

    expect(result).toBe('Filipino Chicken Adobo')
  })
})
