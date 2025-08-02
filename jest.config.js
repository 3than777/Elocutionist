/**
 * Jest Configuration for AI Interview Coach Backend
 * 
 * This configuration enables TypeScript support through ts-jest,
 * sets up the test environment for Node.js, and defines test patterns
 * and coverage requirements.
 * 
 * Related: Task #29 - Jest testing setup
 */

module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Set test environment to Node.js
  testEnvironment: 'node',
  
  // Root directories for tests
  roots: ['<rootDir>/src'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  
  // Transform TypeScript files using ts-jest with new configuration format
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        skipLibCheck: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        isolatedModules: false,
        noEmit: true,
        allowJs: true
      }
    }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/tests/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts' // Exclude main entry point
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Coverage report formats
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Test timeout (in milliseconds)
  testTimeout: 30000,
  
  // Clear mocks automatically between tests
  clearMocks: true,
  
  // Restore mocks automatically between tests
  restoreMocks: true,
  
  // Verbose output for better debugging
  verbose: true,
  
  // Setup environment variables for tests
  setupFiles: ['dotenv/config'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(openai)/)'
  ],
  
  // Module paths for absolute imports
  modulePaths: ['<rootDir>/src'],
  
  // Detect open handles (useful for debugging async issues)
  detectOpenHandles: false,
  
  // Force exit after test run completes
  forceExit: true
}; 