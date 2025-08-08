// Quick test to validate the filler word detection configuration
const { 
  configureFillerWordDetection, 
  enableBalancedMode,
  speechRecognitionConfig 
} = require('./dreamcollege-frontend/src/services/speechRecognition.js');

console.log('Testing filler word detection configuration...');

// Test default configuration
console.log('Default config:', speechRecognitionConfig);

// Test different modes
console.log('\nTesting filler word detection modes:');

configureFillerWordDetection('natural');
console.log('Natural mode configured');

configureFillerWordDetection('sensitive');  
console.log('Sensitive mode configured');

configureFillerWordDetection('strict');
console.log('Strict mode configured');

configureFillerWordDetection('disabled');
console.log('Disabled mode configured');

// Test balanced mode
enableBalancedMode();
console.log('Balanced mode configured');

console.log('\nFiller word detection configuration test completed successfully!');