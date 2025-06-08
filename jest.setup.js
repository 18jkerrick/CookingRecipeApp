import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
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
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  ingredients: ['1 cup flour', '2 eggs'],
                  instructions: ['Mix ingredients', 'Bake for 30 minutes']
                })
              }
            }]
          })
        }
      },
      audio: {
        transcriptions: {
          create: jest.fn().mockResolvedValue({
            text: 'Mocked transcription text'
          })
        }
      }
    }))
  }
})

// Mock fetch globally
global.fetch = jest.fn()

// Jest setup file for handling test environment and cleanup

// Suppress punycode deprecation warning
const originalWarn = console.warn
console.warn = (...args) => {
  if (args[0]?.includes('punycode')) return
  if (args[0]?.includes('fake timers')) return
  originalWarn(...args)
}

// Suppress React testing library deprecation warning
const originalError = console.error
console.error = (...args) => {
  if (args[0]?.includes('ReactDOMTestUtils.act')) return
  if (args[0]?.includes('act` from `react` instead')) return
  originalError(...args)
}

// Global test cleanup
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks()
})

// Global test teardown
afterAll(() => {
  // Force cleanup of any remaining timers
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
  
  // Restore console methods
  console.warn = originalWarn
  console.error = originalError
}) 