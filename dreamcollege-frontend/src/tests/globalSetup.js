/**
 * Global Test Setup for Voice Mode Testing
 * 
 * Sets up the testing environment before all tests run.
 * Configures global mocks and environment variables.
 * 
 * Task: Voice Mode Feature Implementation - Step 17
 */

export default function globalSetup() {
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
}