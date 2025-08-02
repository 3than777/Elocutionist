# Test Script for Step 24: Session Creation Endpoint
# POST /api/sessions
# 
# This script tests the session creation endpoint with various scenarios:
# - Authentication validation
# - Interview ID validation
# - Interview ownership verification
# - Duplicate session prevention
# - Response format validation

$baseUrl = "http://localhost:3000"
$testResults = @()

Write-Host "`n=== Testing Step 24: POST /api/sessions ===" -ForegroundColor Cyan

# Helper function to make API calls and handle errors
function Test-ApiCall {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [string]$TestName,
        [int]$ExpectedStatus
    )
    
    Write-Host "`nTest: $TestName" -ForegroundColor Yellow
    Write-Host "Expected Status: $ExpectedStatus"
    
    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            Headers = $Headers
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json
        
        Write-Host "Actual Status: $statusCode" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Gray
        
        $passed = $statusCode -eq $ExpectedStatus
        $script:testResults += @{
            Test = $TestName
            Expected = $ExpectedStatus
            Actual = $statusCode
            Passed = $passed
        }
        
        return @{
            Success = $true
            Response = $response
            Content = $content
            StatusCode = $statusCode
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Actual Status: $statusCode" -ForegroundColor Red
        
        try {
            $errorContent = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "Error Response: $($_.ErrorDetails.Message)" -ForegroundColor Gray
        }
        catch {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
        }
        
        $passed = $statusCode -eq $ExpectedStatus
        $script:testResults += @{
            Test = $TestName
            Expected = $ExpectedStatus
            Actual = $statusCode
            Passed = $passed
        }
        
        return @{
            Success = $false
            StatusCode = $statusCode
            Error = $_.Exception.Message
        }
    }
}

# Test 1: Missing Authentication (401)
Write-Host "`n--- Authentication Tests ---" -ForegroundColor Magenta

$body = @{ interviewId = "123456789012345678901234" } | ConvertTo-Json
Test-ApiCall -Method POST -Uri "$baseUrl/api/sessions" `
    -Body $body `
    -Headers @{ "Content-Type" = "application/json" } `
    -TestName "Missing Authentication" `
    -ExpectedStatus 401

# Test 2: Invalid Token (401)
$headers = @{ 
    "Authorization" = "Bearer invalid-token-here"
    "Content-Type" = "application/json"
}
Test-ApiCall -Method POST -Uri "$baseUrl/api/sessions" `
    -Body $body `
    -Headers $headers `
    -TestName "Invalid Token" `
    -ExpectedStatus 401

# Test 3: Setup - Register User and Get Token
Write-Host "`n--- Setup: Creating Test User ---" -ForegroundColor Magenta

$registerBody = @{ 
    email = "test-step24-$(Get-Random -Maximum 99999)@example.com"
    password = "Password123!"
    name = "Test User Step Twenty-Four"
    grade = 11
    targetMajor = "Computer Science"
} | ConvertTo-Json

$registerResult = Test-ApiCall -Method POST -Uri "$baseUrl/api/auth/register" `
    -Body $registerBody `
    -Headers @{ "Content-Type" = "application/json" } `
    -TestName "Register Test User" `
    -ExpectedStatus 201

if (-not $registerResult.Success) {
    Write-Host "`nFailed to register test user. Exiting..." -ForegroundColor Red
    exit 1
}

$token = $registerResult.Content.token
$userId = $registerResult.Content.user.id
Write-Host "Token obtained: $($token.Substring(0, 20))..." -ForegroundColor Green
Write-Host "User ID: $userId" -ForegroundColor Green

# Test 4: Missing Interview ID (400)
Write-Host "`n--- Validation Tests ---" -ForegroundColor Magenta

$authHeaders = @{ 
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$emptyBody = @{} | ConvertTo-Json
Test-ApiCall -Method POST -Uri "$baseUrl/api/sessions" `
    -Body $emptyBody `
    -Headers $authHeaders `
    -TestName "Missing Interview ID" `
    -ExpectedStatus 400

# Test 5: Invalid Interview ID Format (400)
$invalidBody = @{ interviewId = "invalid-id-format" } | ConvertTo-Json
Test-ApiCall -Method POST -Uri "$baseUrl/api/sessions" `
    -Body $invalidBody `
    -Headers $authHeaders `
    -TestName "Invalid Interview ID Format" `
    -ExpectedStatus 400

# Test 6: Setup - Create Test Interview
Write-Host "`n--- Setup: Creating Test Interview ---" -ForegroundColor Magenta

$interviewBody = @{
    interviewType = "behavioral"
    interviewDifficulty = "intermediate"
    duration = 30
} | ConvertTo-Json

$interviewResult = Test-ApiCall -Method POST -Uri "$baseUrl/api/interviews" `
    -Body $interviewBody `
    -Headers $authHeaders `
    -TestName "Create Test Interview" `
    -ExpectedStatus 201

if (-not $interviewResult.Success) {
    Write-Host "`nFailed to create test interview. Exiting..." -ForegroundColor Red
    exit 1
}

$interviewId = $interviewResult.Content.interview.id
Write-Host "Interview ID: $interviewId" -ForegroundColor Green

# Test 7: Valid Session Creation (201 - Happy Path)
Write-Host "`n--- Happy Path Test ---" -ForegroundColor Magenta

$sessionBody = @{ interviewId = $interviewId } | ConvertTo-Json
$sessionResult = Test-ApiCall -Method POST -Uri "$baseUrl/api/sessions" `
    -Body $sessionBody `
    -Headers $authHeaders `
    -TestName "Valid Session Creation" `
    -ExpectedStatus 201

if ($sessionResult.Success) {
    $sessionData = $sessionResult.Content.data
    Write-Host "`nSession Details:" -ForegroundColor Green
    Write-Host "  Session ID: $($sessionData.sessionId)"
    Write-Host "  Interview ID: $($sessionData.interviewId)"
    Write-Host "  User ID: $($sessionData.userId)"
    Write-Host "  Status: $($sessionData.status)"
    Write-Host "  Processing Status: $($sessionData.processingStatus | ConvertTo-Json -Compress)"
    Write-Host "  Created At: $($sessionData.createdAt)"
}

# Test 8: Non-existent Interview (404)
Write-Host "`n--- Error Cases ---" -ForegroundColor Magenta

$notFoundBody = @{ interviewId = "111111111111111111111111" } | ConvertTo-Json
Test-ApiCall -Method POST -Uri "$baseUrl/api/sessions" `
    -Body $notFoundBody `
    -Headers $authHeaders `
    -TestName "Non-existent Interview" `
    -ExpectedStatus 404

# Test 9: Access Forbidden - Different User's Interview (403)
Write-Host "`n--- Creating Second User for Ownership Test ---" -ForegroundColor Magenta

$registerBody2 = @{ 
    email = "test-step24-user2-$(Get-Random -Maximum 99999)@example.com"
    password = "Password123!"
    name = "Test User Two"
    grade = 12
    targetMajor = "Business"
} | ConvertTo-Json

$registerResult2 = Test-ApiCall -Method POST -Uri "$baseUrl/api/auth/register" `
    -Body $registerBody2 `
    -Headers @{ "Content-Type" = "application/json" } `
    -TestName "Register Second User" `
    -ExpectedStatus 201

if ($registerResult2.Success) {
    $token2 = $registerResult2.Content.token
    $authHeaders2 = @{ 
        "Authorization" = "Bearer $token2"
        "Content-Type" = "application/json"
    }
    
    Test-ApiCall -Method POST -Uri "$baseUrl/api/sessions" `
        -Body $sessionBody `
        -Headers $authHeaders2 `
        -TestName "Access Forbidden - Different User's Interview" `
        -ExpectedStatus 403
}

# Test 10: Duplicate Session (409 Conflict)
Test-ApiCall -Method POST -Uri "$baseUrl/api/sessions" `
    -Body $sessionBody `
    -Headers $authHeaders `
    -TestName "Duplicate Session" `
    -ExpectedStatus 409

# Test 11: Response Format Validation
Write-Host "`n--- Response Format Validation ---" -ForegroundColor Magenta

# Create a new interview and session to test response format
$newInterviewBody = @{
    interviewType = "technical"
    interviewDifficulty = "expert"
    duration = 45
} | ConvertTo-Json

$newInterviewResult = Test-ApiCall -Method POST -Uri "$baseUrl/api/interviews" `
    -Body $newInterviewBody `
    -Headers $authHeaders `
    -TestName "Create Interview for Format Test" `
    -ExpectedStatus 201

if ($newInterviewResult.Success) {
    $newInterviewId = $newInterviewResult.Content.interview.id
    $newSessionBody = @{ interviewId = $newInterviewId } | ConvertTo-Json
    
    $formatResult = Test-ApiCall -Method POST -Uri "$baseUrl/api/sessions" `
        -Body $newSessionBody `
        -Headers $authHeaders `
        -TestName "Session Creation for Format Validation" `
        -ExpectedStatus 201
    
    if ($formatResult.Success) {
        $responseData = $formatResult.Content
        Write-Host "`nResponse Format Validation:" -ForegroundColor Yellow
        Write-Host "  Has success field: $($null -ne $responseData.success)"
        Write-Host "  Has message field: $($null -ne $responseData.message)"
        Write-Host "  Has data field: $($null -ne $responseData.data)"
        
        $data = $responseData.data
        Write-Host "  Data has sessionId: $($null -ne $data.sessionId)"
        Write-Host "  Data has interviewId: $($null -ne $data.interviewId)"
        Write-Host "  Data has userId: $($null -ne $data.userId)"
        Write-Host "  Data has status: $($null -ne $data.status)"
        Write-Host "  Data has processingStatus: $($null -ne $data.processingStatus)"
        Write-Host "  Data has createdAt: $($null -ne $data.createdAt)"
        
        # Validate processing status fields
        if ($data.processingStatus) {
            Write-Host "`n  Processing Status Fields:" -ForegroundColor Yellow
            Write-Host "    Transcription: $($data.processingStatus.transcription)"
            Write-Host "    Analysis: $($data.processingStatus.analysis)"
            Write-Host "    Feedback: $($data.processingStatus.feedback)"
        }
    }
}

# Display Test Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
$passedTests = $testResults | Where-Object { $_.Passed }
$failedTests = $testResults | Where-Object { -not $_.Passed }

Write-Host "Total Tests: $($testResults.Count)"
Write-Host "Passed: $($passedTests.Count)" -ForegroundColor Green
Write-Host "Failed: $($failedTests.Count)" -ForegroundColor Red

if ($failedTests.Count -gt 0) {
    Write-Host "`nFailed Tests:" -ForegroundColor Red
    $failedTests | ForEach-Object {
        Write-Host "  - $($_.Test): Expected $($_.Expected), Got $($_.Actual)" -ForegroundColor Red
    }
}

# Create test results summary
$summary = @"

## Step 24 Test Results Summary

Total Tests: $($testResults.Count)
Passed: $($passedTests.Count)
Failed: $($failedTests.Count)

### Test Details:
"@

$testResults | ForEach-Object {
    $status = if ($_.Passed) { "PASS" } else { "FAIL" }
    $summary += "`n- [$status] $($_.Test): Expected $($_.Expected), Got $($_.Actual)"
}

$summary | Out-File -FilePath "step24-test-results.txt" -Encoding UTF8
Write-Host "`nTest results saved to step24-test-results.txt" -ForegroundColor Cyan

# Exit with appropriate code
if ($failedTests.Count -eq 0) {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nSome tests failed. Please review the results." -ForegroundColor Red
    exit 1
} 