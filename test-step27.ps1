# Test script for Step 27 - Generate Feedback Endpoint
# This script tests the POST /api/sessions/:id/generate-feedback endpoint

Write-Host "Step 27 Test - Generate Feedback Endpoint" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Note: This test assumes you have:
# 1. A valid JWT token from login
# 2. An existing session with transcript entries
# 3. OPENAI_API_KEY configured in .env

$baseUrl = "http://localhost:3000/api"

# Example usage (replace with actual values):
Write-Host "`nExample API call:" -ForegroundColor Yellow
Write-Host "POST $baseUrl/sessions/{sessionId}/generate-feedback" -ForegroundColor Green
Write-Host "Authorization: Bearer {your-jwt-token}" -ForegroundColor Green

Write-Host "`nExpected Response (200 OK):" -ForegroundColor Yellow
Write-Host @"
{
  "success": true,
  "message": "Feedback generated and stored successfully",
  "data": {
    "sessionId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "feedback": {
      "overallRating": 7.5,
      "overallScore": 75,
      "strengths": [
        "Clear communication",
        "Good structure in responses"
      ],
      "weaknesses": [
        "Needs more specific examples",
        "Some filler words detected"
      ],
      "recommendations": [
        {
          "area": "Content Structure",
          "suggestion": "Use STAR method for behavioral questions",
          "priority": "high"
        }
      ],
      "detailedScores": {
        "contentRelevance": 75,
        "communication": 80,
        "confidence": 70,
        "structure": 65,
        "engagement": 85
      },
      "summary": "Overall good performance with clear communication..."
    },
    "feedbackGeneratedAt": "2025-01-21T12:00:00.000Z",
    "processingStatus": {
      "transcription": "completed",
      "analysis": "completed",
      "feedback": "completed"
    }
  }
}
"@ -ForegroundColor Gray

Write-Host "`nPossible Error Responses:" -ForegroundColor Yellow
Write-Host "- 400 Bad Request: Invalid session ID or no transcript data" -ForegroundColor Red
Write-Host "- 403 Forbidden: Not the session owner" -ForegroundColor Red
Write-Host "- 404 Not Found: Session not found" -ForegroundColor Red
Write-Host "- 409 Conflict: Feedback already generated" -ForegroundColor Red
Write-Host "- 429 Too Many Requests: OpenAI rate limit" -ForegroundColor Red
Write-Host "- 500 Internal Server Error: OpenAI API or server error" -ForegroundColor Red

Write-Host "`nNote: This endpoint requires:" -ForegroundColor Magenta
Write-Host "1. Valid JWT authentication token" -ForegroundColor White
Write-Host "2. Session with transcript entries (user responses)" -ForegroundColor White
Write-Host "3. Valid OPENAI_API_KEY in environment" -ForegroundColor White
Write-Host "4. Sufficient OpenAI API credits" -ForegroundColor White

Write-Host "`nTest Complete!" -ForegroundColor Green 