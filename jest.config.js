const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/', // Ignore old test directory
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@acme/db/client$': '<rootDir>/packages/db/src/client/index.ts',
    '^@acme/db/server$': '<rootDir>/packages/db/src/server/index.ts',
    '^@acme/db/shared/(.*)$': '<rootDir>/packages/db/src/shared/$1',
  },
  // Add timeout configuration for async tests
  testTimeout: 30000,
  // Force Jest to exit immediately after tests complete
  forceExit: true,
  // Detect open handles to help with debugging
  detectOpenHandles: false, // Disable by default for speed
  // Limit workers to reduce complexity
  maxWorkers: 1,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig) 