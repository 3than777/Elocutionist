/**
 * Jest Configuration for Voice Mode Frontend Tests
 * 
 * Configuration for testing React components and services with Web Speech API mocking.
 * Enables comprehensive testing of voice features with browser compatibility simulation.
 * 
 * Task: Voice Mode Feature Implementation - Step 17
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

export default {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  
  // Transform files
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/tests/**/*.test.{js,jsx}',
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx}'
  ],
  
  // Module name mapping for path resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/components/**/*.{js,jsx}',
    'src/services/**/*.{js,jsx}',
    'src/utils/**/*.{js,jsx}',
    'src/hooks/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/tests/**/*',
    '!src/main.jsx',
    '!src/index.js'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Voice-specific modules should have higher coverage
    'src/services/speechRecognition.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/services/textToSpeech.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/utils/voiceCompatibility.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage output
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(react-markdown|remark-.*|unified|bail|is-plain-obj|trough|vfile.*)/)'
  ],
  
  // Global setup for Web Speech API mocking
  // globalSetup: '<rootDir>/src/tests/globalSetup.js',
  
  // Global teardown
  // globalTeardown: '<rootDir>/src/tests/globalTeardown.js'
};