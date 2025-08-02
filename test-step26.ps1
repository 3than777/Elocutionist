#!/usr/bin/env pwsh
# Test script for Step 26: GET /api/sessions/interview/:interviewId endpoint
# Tests retrieving session recording for specific interview

Write-Host "=== Testing Step 26: GET /api/sessions/interview/:interviewId ===" -ForegroundColor Cyan
Write-Host ""

# Test configuration
$baseUrl = "http://localhost:3000"

# Test results tracking
$testResults = @()

function Test-Endpoint {
    param(
        [string]$TestName,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectedStatus
    )
    
    Write-Host "Testing: $TestName" -ForegroundColor Yellow
    
    try {
        $params = @{
            Method = $Method
            Uri = $Url
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = $Body
        }
        
        $response = Invoke-WebRequest @params -UseBasicParsing -ErrorAction Stop
        $statusCode = $response.StatusCode
        $responseBody = $response.Content | ConvertFrom-Json
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "PASSED: Status $statusCode" -ForegroundColor Green
            $script:testResults += @{ Test = $TestName; Result = "PASSED"; Status = $statusCode }
            return $responseBody
        } else {
            Write-Host "FAILED: Expected $ExpectedStatus, got $statusCode" -ForegroundColor Red
            $script:testResults += @{ Test = $TestName; Result = "FAILED"; Status = $statusCode; Expected = $ExpectedStatus }
            return $null
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "PASSED: Status $statusCode (Expected error)" -ForegroundColor Green
            $script:testResults += @{ Test = $TestName; Result = "PASSED"; Status = $statusCode }
            
            # Try to get error response body
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd() | ConvertFrom-Json
                return $responseBody
            } catch {
                return $null
            }
        } else {
            Write-Host "FAILED: Expected $ExpectedStatus, got $statusCode" -ForegroundColor Red
            Write-Host "  Error: $_" -ForegroundColor Red
            $script:testResults += @{ Test = $TestName; Result = "FAILED"; Status = $statusCode; Expected = $ExpectedStatus; Error = $_.ToString() }
            return $null
        }
    }
    Write-Host ""
}

# First, register a new user and get a fresh token
Write-Host "=== Creating test user ===" -ForegroundColor Cyan
Write-Host ""

$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$registerBody = @{
    email = "testuser$timestamp@example.com"
    password = "TestPass123!"
    name = "Test User"
    grade = 11
    targetMajor = "Computer Science"
} | ConvertTo-Json

$registerResult = Test-Endpoint `
    -TestName "Register test user" `
    -Method "POST" `
    -Url "$baseUrl/api/auth/register" `
    -Body $registerBody `
    -ExpectedStatus 201

if (-not $registerResult -or -not $registerResult.token) {
    Write-Host "Failed to register test user. Cannot continue with tests." -ForegroundColor Red
    exit 1
}

$testToken = $registerResult.token
Write-Host "Got fresh token for testing" -ForegroundColor Green
Write-Host ""

# Now proceed with the actual tests
Write-Host "=== Setting up test data ===" -ForegroundColor Cyan
Write-Host ""

# Create an interview
$interviewBody = @{
    interviewType = "behavioral"
    interviewDifficulty = "intermediate"
    duration = 30
} | ConvertTo-Json

$interview = Test-Endpoint `
    -TestName "Create test interview" `
    -Method "POST" `
    -Url "$baseUrl/api/interviews" `
    -Headers @{ "Authorization" = "Bearer $testToken" } `
    -Body $interviewBody `
    -ExpectedStatus 201

$interviewId = $null
$sessionId = $null

if ($interview -and $interview.interview.id) {
    $interviewId = $interview.interview.id
    Write-Host "Created interview: $interviewId" -ForegroundColor Green
    
    # Create a session for this interview
    $sessionBody = @{
        interviewId = $interviewId
    } | ConvertTo-Json
    
    $session = Test-Endpoint `
        -TestName "Create test session" `
        -Method "POST" `
        -Url "$baseUrl/api/sessions" `
        -Headers @{ "Authorization" = "Bearer $testToken" } `
        -Body $sessionBody `
        -ExpectedStatus 201
    
    if ($session -and $session.data.sessionId) {
        $sessionId = $session.data.sessionId
        Write-Host "Created session: $sessionId" -ForegroundColor Green
        
        # Add some transcript entries
        $transcriptBody = @{
            speaker = "user"
            text = "This is a test transcript entry"
            confidence = 0.95
            duration = 5000
        } | ConvertTo-Json
        
        Test-Endpoint `
            -TestName "Add transcript entry" `
            -Method "POST" `
            -Url "$baseUrl/api/sessions/$sessionId/transcript" `
            -Headers @{ "Authorization" = "Bearer $testToken" } `
            -Body $transcriptBody `
            -ExpectedStatus 201
    }
}

Write-Host ""
Write-Host "=== Testing GET /api/sessions/interview/:interviewId ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Happy path - Get session for existing interview
if ($interviewId) {
    $result = Test-Endpoint `
        -TestName "Get session for existing interview (Happy Path)" `
        -Method "GET" `
        -Url "$baseUrl/api/sessions/interview/$interviewId" `
        -Headers @{ "Authorization" = "Bearer $testToken" } `
        -ExpectedStatus 200
    
    if ($result) {
        Write-Host "  Session data retrieved:" -ForegroundColor Gray
        Write-Host "  - Session ID: $($result.data.sessionId)" -ForegroundColor Gray
        Write-Host "  - Interview ID: $($result.data.interviewId)" -ForegroundColor Gray
        Write-Host "  - Status: $($result.data.status)" -ForegroundColor Gray
        Write-Host "  - Transcript entries: $($result.data.transcriptCount)" -ForegroundColor Gray
        Write-Host ""
    }
}

# Test 2: Invalid interview ID format
Test-Endpoint `
    -TestName "Invalid interview ID format (400)" `
    -Method "GET" `
    -Url "$baseUrl/api/sessions/interview/invalid-id-format" `
    -Headers @{ "Authorization" = "Bearer $testToken" } `
    -ExpectedStatus 400

# Test 3: Non-existent interview ID
Test-Endpoint `
    -TestName "Non-existent interview ID (404)" `
    -Method "GET" `
    -Url "$baseUrl/api/sessions/interview/507f1f77bcf86cd799439011" `
    -Headers @{ "Authorization" = "Bearer $testToken" } `
    -ExpectedStatus 404

# Test 4: Missing authentication
if ($interviewId) {
    Test-Endpoint `
        -TestName "Missing authentication (401)" `
        -Method "GET" `
        -Url "$baseUrl/api/sessions/interview/$interviewId" `
        -ExpectedStatus 401
}

# Test 5: Invalid token
if ($interviewId) {
    Test-Endpoint `
        -TestName "Invalid authentication token (401)" `
        -Method "GET" `
        -Url "$baseUrl/api/sessions/interview/$interviewId" `
        -Headers @{ "Authorization" = "Bearer invalid-token" } `
        -ExpectedStatus 401
}

# Test 6: Interview without session
# Create an interview without a session
$interviewWithoutSessionBody = @{
    interviewType = "technical"
    interviewDifficulty = "advanced"
    duration = 45
} | ConvertTo-Json

$interviewWithoutSession = Test-Endpoint `
    -TestName "Create interview without session" `
    -Method "POST" `
    -Url "$baseUrl/api/interviews" `
    -Headers @{ "Authorization" = "Bearer $testToken" } `
    -Body $interviewWithoutSessionBody `
    -ExpectedStatus 201

if ($interviewWithoutSession -and $interviewWithoutSession.interview.id) {
    $noSessionInterviewId = $interviewWithoutSession.interview.id
    
    Test-Endpoint `
        -TestName "Get session for interview without session (404)" `
        -Method "GET" `
        -Url "$baseUrl/api/sessions/interview/$noSessionInterviewId" `
        -Headers @{ "Authorization" = "Bearer $testToken" } `
        -ExpectedStatus 404
}

# Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
$passed = ($testResults | Where-Object { $_.Result -eq "PASSED" }).Count
$failed = ($testResults | Where-Object { $_.Result -eq "FAILED" }).Count
$total = $testResults.Count

Write-Host "Total tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })

if ($failed -gt 0) {
    Write-Host ""
    Write-Host "Failed tests:" -ForegroundColor Red
    $testResults | Where-Object { $_.Result -eq "FAILED" } | ForEach-Object {
        Write-Host "  - $($_.Test): Expected $($_.Expected), got $($_.Status)" -ForegroundColor Red
        if ($_.Error) {
            Write-Host "    Error: $($_.Error)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan 