require('@testing-library/jest-dom')

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

// Jest setup file for handling test environment and cleanup

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