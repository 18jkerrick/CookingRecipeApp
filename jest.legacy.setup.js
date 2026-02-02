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

// Jest setup file for handling test environment and cleanup
let server

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

beforeAll(async () => {
  const mswNode = await import('msw/node')
  const mocks = await import('./tests/mocks/handlers')
  server = mswNode.setupServer(...mocks.handlers)
  server.listen({ onUnhandledRequest: 'warn' })
})

// Global test cleanup
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks()
  if (server) {
    server.resetHandlers()
  }
})

// Global test teardown
afterAll(() => {
  if (server) {
    server.close()
  }
  // Force cleanup of any remaining timers
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
  
  // Restore console methods
  console.warn = originalWarn
  console.error = originalError
}) 