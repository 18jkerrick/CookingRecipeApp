import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './tests/msw/server'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock OpenAI
vi.mock('openai', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ingredients: ['1 cup flour', '2 eggs'],
                  instructions: ['Mix ingredients', 'Bake for 30 minutes'],
                }),
              },
            },
          ],
        }),
      },
    },
    audio: {
      transcriptions: {
        create: vi.fn().mockResolvedValue({
          text: 'Mocked transcription text',
        }),
      },
    },
  })),
}))

// Suppress punycode deprecation warning
const originalWarn = console.warn
console.warn = (...args) => {
  const first = args[0]
  if (typeof first === 'string' && first.includes('punycode')) return
  if (typeof first === 'string' && first.includes('fake timers')) return
  originalWarn(...args)
}

// Suppress React testing library deprecation warning
const originalError = console.error
console.error = (...args) => {
  const first = args[0]
  if (typeof first === 'string' && first.includes('ReactDOMTestUtils.act')) return
  if (typeof first === 'string' && first.includes('act` from `react` instead')) return
  originalError(...args)
}

// MSW lifecycle
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
  console.warn = originalWarn
  console.error = originalError
})
