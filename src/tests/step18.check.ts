/**
 * Step 18 Test: generateInterviewQuestions Method Testing
 * 
 * This file tests the specific functionality implemented in step 18:
 * - generateInterviewQuestions method that accepts interviewType, difficulty, userMajor
 * - Calls OpenAI GPT-4 API to generate 5 relevant interview questions
 * - Returns array of question strings
 * 
 * Test Date: 2025-01-20
 * Related Task: Step 18 - generateInterviewQuestions method implementation
 */

import dotenv from 'dotenv';
import { generateInterviewQuestions } from '../services/openai.service';

// Load environment variables (attempt both .env file and system variables)
dotenv.config();

/**
 * Main test function for step 18 implementation
 */
async function testStep18Implementation(): Promise<void> {
  console.log('🚀 Starting Step 18 Tests: generateInterviewQuestions Method');
  console.log('============================================================');

  // Check environment setup
  console.log('\n🔧 Environment Check');
  console.log(`OPENAI_API_KEY configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  if (process.env.OPENAI_API_KEY) {
    console.log(`API Key length: ${process.env.OPENAI_API_KEY.length} characters`);
    console.log(`API Key prefix: ${process.env.OPENAI_API_KEY.substring(0, 7)}...`);
  }

  let testsPassed = 0;
  let totalTests = 0;

  try {
    // Test 1: Basic Happy Path - Required Parameters Only
    console.log('\n📋 Test 1: Basic Question Generation (Required Parameters)');
    console.log('Parameters: behavioral, intermediate, Computer Science');
    totalTests++;
    
    const basicQuestions = await generateInterviewQuestions(
      'behavioral',
      'intermediate', 
      'Computer Science'
    );

    console.log(`✅ Success: Generated ${basicQuestions.length} questions`);
    console.log('Questions received:');
    basicQuestions.forEach((q, i) => console.log(`  ${i + 1}. ${q.substring(0, 80)}...`));
    
    // Validate basic requirements
    if (basicQuestions.length === 5) {
      console.log('✅ Correct number of questions (5)');
      testsPassed++;
    } else {
      console.log(`❌ Expected 5 questions, got ${basicQuestions.length}`);
    }

    // Test 2: Different Interview Types
    console.log('\n📋 Test 2: Different Interview Types');
    totalTests++;
    
    try {
      const technicalQuestions = await generateInterviewQuestions(
        'technical',
        'advanced',
        'Software Engineering'
      );
      
      console.log(`✅ Technical questions generated: ${technicalQuestions.length} questions`);
      
      const caseStudyQuestions = await generateInterviewQuestions(
        'case_study',
        'expert',
        'Business Administration'
      );
      
      console.log(`✅ Case study questions generated: ${caseStudyQuestions.length} questions`);
      
      if (technicalQuestions.length > 0 && caseStudyQuestions.length > 0) {
        testsPassed++;
      }
    } catch (error: any) {
      console.log(`❌ Interview types test failed: ${error.message}`);
    }

    // Test 3: Different Difficulty Levels
    console.log('\n📋 Test 3: Different Difficulty Levels');
    totalTests++;
    
    try {
      const beginnerQuestions = await generateInterviewQuestions(
        'behavioral',
        'beginner',
        'Psychology'
      );
      
      console.log(`✅ Beginner questions generated: ${beginnerQuestions.length} questions`);
      
      const expertQuestions = await generateInterviewQuestions(
        'behavioral',
        'expert',
        'Medicine'
      );
      
      console.log(`✅ Expert questions generated: ${expertQuestions.length} questions`);
      
      if (beginnerQuestions.length > 0 && expertQuestions.length > 0) {
        testsPassed++;
      }
    } catch (error: any) {
      console.log(`❌ Difficulty levels test failed: ${error.message}`);
    }

    // Test 4: Different Majors
    console.log('\n📋 Test 4: Different Academic Majors');
    totalTests++;
    
    try {
      const majorTests = [
        { major: 'Engineering', type: 'technical' },
        { major: 'Liberal Arts', type: 'behavioral' },
        { major: 'Business', type: 'case_study' }
      ];

      let majorTestsPassed = 0;
      for (const test of majorTests) {
        const questions = await generateInterviewQuestions(
          test.type as any,
          'intermediate',
          test.major
        );
        console.log(`✅ ${test.major} (${test.type}): ${questions.length} questions generated`);
        if (questions.length > 0) majorTestsPassed++;
      }
      
      if (majorTestsPassed === majorTests.length) {
        testsPassed++;
      }
    } catch (error: any) {
      console.log(`❌ Different majors test failed: ${error.message}`);
    }

    // Test 5: Advanced Parameters (Additional Params)
    console.log('\n📋 Test 5: Advanced Parameters Testing');
    totalTests++;
    
    try {
      const advancedQuestions = await generateInterviewQuestions(
        'behavioral',
        'intermediate',
        'Computer Science',
        {
          questionCount: 3,
          customPrompt: 'Focus on teamwork and leadership experiences',
          previousQuestions: ['Tell me about yourself'],
          targetColleges: ['MIT', 'Stanford'],
          userGrade: 12,
          userStrengths: ['programming', 'problem-solving'],
          userWeaknesses: ['public speaking']
        }
      );
      
      console.log(`✅ Advanced parameters: Generated ${advancedQuestions.length} questions`);
      console.log('Sample question with custom focus:');
      console.log(`  "${advancedQuestions[0]}"`);
      
      if (advancedQuestions.length === 3) {
        console.log('✅ Custom question count working (requested 3)');
        testsPassed++;
      } else {
        console.log(`❌ Expected 3 questions, got ${advancedQuestions.length}`);
      }
    } catch (error: any) {
      console.log(`❌ Advanced parameters test failed: ${error.message}`);
    }

    // Test 6: Question Quality Validation
    console.log('\n📋 Test 6: Question Quality Validation');
    totalTests++;
    
    try {
      const qualityQuestions = await generateInterviewQuestions(
        'behavioral',
        'intermediate',
        'Data Science'
      );
      
      // Check question characteristics
      const allQuestionsValid = qualityQuestions.every(q => 
        q.length > 10 && // Not too short
        q.trim().length === q.length && // No leading/trailing whitespace
        q.length < 500 // Not too long
      );
      
      const hasQuestionMarks = qualityQuestions.some(q => q.includes('?'));
      
      if (allQuestionsValid && hasQuestionMarks) {
        console.log('✅ All questions meet quality criteria');
        testsPassed++;
      } else {
        console.log('❌ Some questions failed quality validation');
        console.log(`  Valid format: ${allQuestionsValid}`);
        console.log(`  Has question marks: ${hasQuestionMarks}`);
      }
    } catch (error: any) {
      console.log(`❌ Question quality test failed: ${error.message}`);
    }

    // Summary
    console.log('\n🎯 Step 18 Test Results Summary');
    console.log('================================');
    console.log(`✅ Tests Passed: ${testsPassed}/${totalTests}`);
    console.log(`📊 Success Rate: ${Math.round((testsPassed/totalTests) * 100)}%`);

    if (testsPassed === totalTests) {
      console.log('\n🎉 All Step 18 Tests Completed Successfully!');
      console.log('✅ generateInterviewQuestions method is working correctly');
      console.log('✅ OpenAI GPT-4 API integration functional');
      console.log('✅ All required parameters working (interviewType, difficulty, userMajor)');
      console.log('✅ Returns array of question strings as specified');
      console.log('✅ Advanced features working (custom prompts, parameters)');
      console.log('✅ Question quality meets standards');
    } else {
      console.log('\n⚠️ Some tests failed - review implementation');
      if (testsPassed >= totalTests * 0.8) {
        console.log('✅ Overall implementation is functional (80%+ pass rate)');
      }
    }

  } catch (error: any) {
    console.error('\n❌ Step 18 Test Failed:');
    console.error('Error:', error.message);
    
    // Check for common error types
    if (error.message.includes('OPENAI_API_KEY')) {
      console.error('🔑 Issue: OpenAI API key not configured properly');
    } else if (error.message.includes('rate limit')) {
      console.error('⏱️ Issue: OpenAI API rate limit exceeded');
    } else if (error.message.includes('authentication')) {
      console.error('🔐 Issue: OpenAI API authentication failed');
    } else {
      console.error('🔧 Issue: Unexpected error occurred');
    }
    
    throw error;
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  testStep18Implementation()
    .then(() => {
      console.log('\n✅ Step 18 testing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Step 18 testing failed');
      console.error(error);
      process.exit(1);
    });
}

export { testStep18Implementation }; 