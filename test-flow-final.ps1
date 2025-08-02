# AI Interview Coach - Complete Flow Test
$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:3000/api"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$email = "test$($timestamp)@example.com"
$password = "TestPass123!"

Write-Host "`n=== Starting Complete Flow Test ===" -ForegroundColor Cyan

# 1. Register
Write-Host "`n[1] Register User" -ForegroundColor Yellow
$registerBody = @{
    email = $email
    password = $password
    name = "Test User"
    grade = 12
    targetMajor = "Computer Science"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Method POST -Uri "$baseUrl/auth/register" -Body $registerBody -ContentType "application/json"
    $token = $registerResponse.token
    Write-Host "Success: User registered" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0,20))..." -ForegroundColor Gray
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Login
Write-Host "`n[2] Login Test" -ForegroundColor Yellow
$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Method POST -Uri "$baseUrl/auth/login" -Body $loginBody -ContentType "application/json"
    Write-Host "Success: Login works" -ForegroundColor Green
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
}

$headers = @{ Authorization = "Bearer $token" }

# 3. Create Interview
Write-Host "`n[3] Create Interview" -ForegroundColor Yellow
$interviewBody = @{
    interviewType = "behavioral"
    interviewDifficulty = "intermediate"
    duration = 30
} | ConvertTo-Json

try {
    $interviewResponse = Invoke-RestMethod -Method POST -Uri "$baseUrl/interviews" -Body $interviewBody -ContentType "application/json" -Headers $headers
    $interviewId = $interviewResponse.interview.id
    Write-Host "Success: Interview created" -ForegroundColor Green
    Write-Host "ID: $interviewId" -ForegroundColor Gray
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Generate Questions
Write-Host "`n[4] Generate Questions" -ForegroundColor Yellow
try {
    $questionsResponse = Invoke-RestMethod -Method POST -Uri "$baseUrl/interviews/$interviewId/generate-questions" -Headers $headers
    Write-Host "Success: Questions generated" -ForegroundColor Green
    Write-Host "Count: $($questionsResponse.interview.totalQuestions)" -ForegroundColor Gray
} catch {
    Write-Host "Failed (OK if no OpenAI key): $($_.Exception.Message)" -ForegroundColor Yellow
}

# 5. Create Session
Write-Host "`n[5] Create Session" -ForegroundColor Yellow
$sessionBody = @{ interviewId = $interviewId } | ConvertTo-Json

try {
    $sessionResponse = Invoke-RestMethod -Method POST -Uri "$baseUrl/sessions" -Body $sessionBody -ContentType "application/json" -Headers $headers
    $sessionId = $sessionResponse.data.sessionId
    Write-Host "Success: Session created" -ForegroundColor Green
    Write-Host "ID: $sessionId" -ForegroundColor Gray
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 6. Add Transcript
Write-Host "`n[6] Add Transcript" -ForegroundColor Yellow
$transcripts = @(
    @{ speaker = "ai"; text = "Tell me about your leadership experience."; confidence = 1.0 },
    @{ speaker = "user"; text = "I led our debate team to victory."; confidence = 0.95 }
)

$count = 0
foreach ($entry in $transcripts) {
    try {
        $entryBody = $entry | ConvertTo-Json
        $null = Invoke-RestMethod -Method POST -Uri "$baseUrl/sessions/$sessionId/transcript" -Body $entryBody -ContentType "application/json" -Headers $headers
        $count++
    } catch {
        Write-Host "Entry failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host "Success: Added $count entries" -ForegroundColor Green

# 7. Generate Feedback
Write-Host "`n[7] Generate Feedback" -ForegroundColor Yellow
try {
    $feedbackResponse = Invoke-RestMethod -Method POST -Uri "$baseUrl/sessions/$sessionId/generate-feedback" -Headers $headers
    Write-Host "Success: Feedback generated" -ForegroundColor Green
    Write-Host "Rating: $($feedbackResponse.feedback.overallRating)/10" -ForegroundColor Gray
} catch {
    Write-Host "Failed (OK if no OpenAI key): $($_.Exception.Message)" -ForegroundColor Yellow
}

# 8. Get Feedback
Write-Host "`n[8] Retrieve Feedback" -ForegroundColor Yellow
try {
    $getFeedback = Invoke-RestMethod -Method GET -Uri "$baseUrl/sessions/$sessionId/feedback" -Headers $headers
    Write-Host "Success: Feedback retrieved" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "No feedback (OK if generation failed)" -ForegroundColor Yellow
    } else {
        Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Email: $email"
Write-Host "Interview: $interviewId"
Write-Host "Session: $sessionId"
Write-Host "`nNote: OpenAI features need OPENAI_API_KEY in .env" 