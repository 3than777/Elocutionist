# Complete test script for Step 28: GET /api/sessions/:id/feedback endpoint
Write-Host "=== Complete Test for Step 28: GET /api/sessions/:id/feedback ===" -ForegroundColor Cyan
Write-Host "Starting at: $(Get-Date)" -ForegroundColor Gray

$baseUrl = "http://localhost:3000/api"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testResults = @()

# Helper function to test endpoint and capture results
function Test-Endpoint {
    param(
        [string]$TestName,
        [string]$Uri,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectedStatus
    )
    
    Write-Host "`n=== $TestName ===" -ForegroundColor Yellow
    
    try {
        if ($Body) {
            $response = Invoke-WebRequest -Uri $Uri -Method $Method -Headers $Headers -Body $Body -ContentType "application/json" -UseBasicParsing
        } else {
            $response = Invoke-WebRequest -Uri $Uri -Method $Method -Headers $Headers -UseBasicParsing
        }
        
        Write-Host "Status: $($response.StatusCode) - PASSED" -ForegroundColor Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "Response: $($response.Content)" -ForegroundColor Gray
        
        $script:testResults += @{
            Test = $TestName
            Expected = $ExpectedStatus
            Actual = $response.StatusCode
            Passed = $response.StatusCode -eq $ExpectedStatus
        }
        
        return $content
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status: $statusCode" -ForegroundColor $(if ($statusCode -eq $ExpectedStatus) { "Green" } else { "Red" })
        Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Gray
        
        $script:testResults += @{
            Test = $TestName
            Expected = $ExpectedStatus
            Actual = $statusCode
            Passed = $statusCode -eq $ExpectedStatus
        }
        
        return $null
    }
}

# Test 1: Missing Authentication (401)
Test-Endpoint -TestName "Test 1: Missing Authentication" `
    -Uri "$baseUrl/sessions/6880044b77f243072d7c9ec8/feedback" `
    -ExpectedStatus 401

# Register a new user for authenticated tests
Write-Host "`n=== Setting up test user ===" -ForegroundColor Cyan
$registerBody = @{
    email = "test-step28-$timestamp@example.com"
    password = "Password123!"
    name = "Test User"
    grade = 11
    targetMajor = "Engineering"
} | ConvertTo-Json

$registerResponse = Test-Endpoint -TestName "User Registration" `
    -Uri "$baseUrl/auth/register" `
    -Method "POST" `
    -Body $registerBody `
    -ExpectedStatus 201

if ($registerResponse) {
    $token = $registerResponse.token  # Changed from $registerResponse.data.token
    $authHeaders = @{ 
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    Write-Host "User registered successfully. Token acquired." -ForegroundColor Green
} else {
    Write-Host "Registration failed. Exiting tests." -ForegroundColor Red
    exit 1
}

# Test 2: Invalid Session ID Format (400)
Test-Endpoint -TestName "Test 2: Invalid Session ID Format" `
    -Uri "$baseUrl/sessions/invalid-id-format/feedback" `
    -Headers $authHeaders `
    -ExpectedStatus 400

# Test 3: Session Not Found (404)
Test-Endpoint -TestName "Test 3: Session Not Found" `
    -Uri "$baseUrl/sessions/507f1f77bcf86cd799439011/feedback" `
    -Headers $authHeaders `
    -ExpectedStatus 404

# Test 4: Create full session flow and test feedback not yet generated
Write-Host "`n=== Setting up session without feedback ===" -ForegroundColor Cyan

# Create interview
$interviewBody = @{
    interviewType = "behavioral"
    interviewDifficulty = "intermediate"
    duration = 30
} | ConvertTo-Json

$interviewResponse = Test-Endpoint -TestName "Create Interview" `
    -Uri "$baseUrl/interviews" `
    -Method "POST" `
    -Headers $authHeaders `
    -Body $interviewBody `
    -ExpectedStatus 201

if ($interviewResponse) {
    $interviewId = $interviewResponse.interview.id  # Changed from $interviewResponse.data.interviewId
    
    # Create session
    $sessionBody = @{ interviewId = $interviewId } | ConvertTo-Json
    
    $sessionResponse = Test-Endpoint -TestName "Create Session" `
        -Uri "$baseUrl/sessions" `
        -Method "POST" `
        -Headers $authHeaders `
        -Body $sessionBody `
        -ExpectedStatus 201
    
    if ($sessionResponse) {
        $sessionId = $sessionResponse.data.sessionId
        
        # Test 4: Feedback not yet generated (404)
        Test-Endpoint -TestName "Test 4: Feedback Not Yet Generated" `
            -Uri "$baseUrl/sessions/$sessionId/feedback" `
            -Headers $authHeaders `
            -ExpectedStatus 404
        
        # Add transcript entries
        Write-Host "`n=== Adding transcript entries ===" -ForegroundColor Cyan
        
        $transcripts = @(
            @{ speaker = "ai"; text = "Tell me about a time you demonstrated leadership skills." },
            @{ speaker = "user"; text = "In my senior year, I led a team of 5 students in developing a mobile app for our school's event management system. We had tight deadlines and limited resources." }
        )
        
        foreach ($transcript in $transcripts) {
            $transcriptBody = $transcript | ConvertTo-Json
            Test-Endpoint -TestName "Add Transcript: $($transcript.speaker)" `
                -Uri "$baseUrl/sessions/$sessionId/transcript" `
                -Method "POST" `
                -Headers $authHeaders `
                -Body $transcriptBody `
                -ExpectedStatus 201 | Out-Null
        }
        
        # Generate feedback
        Write-Host "`n=== Generating feedback ===" -ForegroundColor Cyan
        Test-Endpoint -TestName "Generate Feedback" `
            -Uri "$baseUrl/sessions/$sessionId/generate-feedback" `
            -Method "POST" `
            -Headers $authHeaders `
            -ExpectedStatus 200 | Out-Null
        
        # Test 5: Happy Path - Retrieve Feedback (200)
        $feedbackResponse = Test-Endpoint -TestName "Test 5: Happy Path - Retrieve Feedback" `
            -Uri "$baseUrl/sessions/$sessionId/feedback" `
            -Headers $authHeaders `
            -ExpectedStatus 200
        
        if ($feedbackResponse) {
            Write-Host "`nFeedback Details:" -ForegroundColor Cyan
            Write-Host "Overall Score: $($feedbackResponse.data.overallScore)/100" -ForegroundColor Green
            Write-Host "Overall Rating: $($feedbackResponse.data.feedback.overallRating)/10" -ForegroundColor Green
            if ($feedbackResponse.data.feedback.strengths) {
                Write-Host "Strengths: $($feedbackResponse.data.feedback.strengths -join ', ')" -ForegroundColor Green
            }
            if ($feedbackResponse.data.feedback.weaknesses) {
                Write-Host "Weaknesses: $($feedbackResponse.data.feedback.weaknesses -join ', ')" -ForegroundColor Yellow
            }
        }
        
        # Test 6: Wrong User's Session (403)
        Write-Host "`n=== Setting up second user for permission test ===" -ForegroundColor Cyan
        
        $registerBody2 = @{
            email = "test-step28-user2-$timestamp@example.com"
            password = "Password123!"
            name = "Test User Two"  # Changed from "Test User 2" to avoid numeric character
            grade = 12
            targetMajor = "Business"
        } | ConvertTo-Json
        
        $registerResponse2 = Test-Endpoint -TestName "Register Second User" `
            -Uri "$baseUrl/auth/register" `
            -Method "POST" `
            -Body $registerBody2 `
            -ExpectedStatus 201
        
        if ($registerResponse2) {
            $token2 = $registerResponse2.token  # Changed from $registerResponse2.data.token
            $authHeaders2 = @{ "Authorization" = "Bearer $token2" }
            
            Test-Endpoint -TestName "Test 6: Wrong User's Session" `
                -Uri "$baseUrl/sessions/$sessionId/feedback" `
                -Headers $authHeaders2 `
                -ExpectedStatus 403
        }
    }
}

# Summary
Write-Host "`n=== TEST SUMMARY ===" -ForegroundColor Cyan
Write-Host "Completed at: $(Get-Date)" -ForegroundColor Gray
Write-Host "`nResults:" -ForegroundColor Yellow

$passedTests = 0
$totalTests = 0

foreach ($result in $testResults) {
    if ($result.Test -like "Test *") {
        $totalTests++
        $status = if ($result.Passed) { 
            $passedTests++
            "PASSED" 
        } else { 
            "FAILED" 
        }
        $color = if ($result.Passed) { "Green" } else { "Red" }
        
        Write-Host "$($result.Test): Expected $($result.Expected), Got $($result.Actual) - $status" -ForegroundColor $color
    }
}

Write-Host "`nTotal: $passedTests/$totalTests tests passed" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })

# Check if all critical tests passed
$criticalTestsPassed = $testResults | Where-Object { $_.Test -like "Test *" } | Where-Object { -not $_.Passed } | Measure-Object | Select-Object -ExpandProperty Count
if ($criticalTestsPassed -eq 0) {
    Write-Host "`n✅ All tests passed! GET /api/sessions/:id/feedback endpoint is working correctly." -ForegroundColor Green
} else {
    Write-Host "`n❌ Some tests failed. Please check the implementation." -ForegroundColor Red
} 