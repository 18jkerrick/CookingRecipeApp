// @vitest-environment node
import { beforeEach, describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { extractRecipeFromCaption } from '@acme/core/ai/extractFromCaption'
import { server } from '../../../mocks/server'

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'

describe('extractRecipeFromCaption', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key'
  })

  it('extracts recipe data from caption', async () => {
    server.use(
      http.post(OPENAI_ENDPOINT, () => {
        return HttpResponse.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ingredients: ['2 eggs', '1 cup flour', '1 cup milk'],
                  instructions: ['Beat eggs', 'Mix with flour', 'Add milk'],
                }),
              },
            },
          ],
        })
      })
    )

    const result = await extractRecipeFromCaption('Recipe for pancakes...')

    expect(result).toEqual({
      ingredients: ['2 eggs', '1 cup flour', '1 cup milk'],
      instructions: ['Beat eggs', 'Mix with flour', 'Add milk'],
    })
  })

  it('returns empty arrays when response is invalid JSON', async () => {
    server.use(
      http.post(OPENAI_ENDPOINT, () => {
        return HttpResponse.json({
          choices: [
            {
              message: {
                content: 'Invalid JSON response',
              },
            },
          ],
        })
      })
    )

    const result = await extractRecipeFromCaption('Some text...')

    expect(result).toEqual({
      ingredients: [],
      instructions: [],
    })
  })

  it('returns empty arrays when response has no content', async () => {
    server.use(
      http.post(OPENAI_ENDPOINT, () => {
        return HttpResponse.json({
          choices: [
            {
              message: {
                content: null,
              },
            },
          ],
        })
      })
    )

    const result = await extractRecipeFromCaption('Some text...')

    expect(result).toEqual({
      ingredients: [],
      instructions: [],
    })
  })

  it('returns empty arrays when OpenAI errors', async () => {
    server.use(
      http.post(OPENAI_ENDPOINT, () => {
        return HttpResponse.json(
          { error: { message: 'Server error' } },
          { status: 500 }
        )
      })
    )

    const result = await extractRecipeFromCaption('Some text...')

    expect(result).toEqual({
      ingredients: [],
      instructions: [],
    })
  })
})
