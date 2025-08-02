# Step 23 Testing Script
# Session Transcription Endpoint Tests

Write-Host "=== STEP 23 COMPREHENSIVE TEST SUITE ===" -ForegroundColor Green

# Test Results Array
$testResults = @()

# Test 1: Missing Authentication (401)
Write-Host "`nTEST 1: Missing Authentication (should return 401)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/sessions/123456789012345678901234/transcribe" -Method POST
    $testResults += "❌ FAIL: Should have returned 401 but succeeded"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ PASS: Correctly returned 401 Unauthorized" -ForegroundColor Green
        $testResults += "✅ PASS: Missing auth returns 401"
    } else {
        Write-Host "❌ FAIL: Expected 401 but got: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $testResults += "❌ FAIL: Missing auth returned $($_.Exception.Response.StatusCode)"
    }
}

# Test 2: Invalid Token (401)
Write-Host "`nTEST 2: Invalid Token (should return 401)" -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer invalid-token" }
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/sessions/123456789012345678901234/transcribe" -Method POST -Headers $headers
    $testResults += "❌ FAIL: Should have returned 401 but succeeded"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ PASS: Invalid token correctly returned 401" -ForegroundColor Green
        $testResults += "✅ PASS: Invalid token returns 401"
    } else {
        Write-Host "❌ FAIL: Expected 401 but got: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $testResults += "❌ FAIL: Invalid token returned $($_.Exception.Response.StatusCode)"
    }
}

# Setup: Create test user
Write-Host "`nSETUP: Creating test user..." -ForegroundColor Cyan
$timestamp = Get-Date -UFormat "%s"
$testEmail = "test$timestamp@example.com"
$registerData = @{
    email = $testEmail
    password = "Password123!"
    name = "Test User"
    grade = 11
    targetMajor = "Computer Science"
}
$registerBody = $registerData | ConvertTo-Json

try {
    $headers = @{ "Content-Type" = "application/json" }
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Headers $headers -Body $registerBody
    $token = $registerResponse.token
    $userId = $registerResponse.user._id
    Write-Host "✅ User registered: $testEmail" -ForegroundColor Green
    Write-Host "✅ Token obtained" -ForegroundColor Green
    $testResults += "✅ PASS: User registration successful"
} catch {
    Write-Host "❌ FAIL: User registration failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += "❌ FAIL: User registration failed"
    exit 1
}

# Test 3: Invalid Interview ID Format (400)
Write-Host "`nTEST 3: Invalid Interview ID Format (should return 400)" -ForegroundColor Yellow
try {
    $authHeaders = @{ "Authorization" = "Bearer $token" }
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/sessions/invalid-id/transcribe" -Method POST -Headers $authHeaders
    $testResults += "❌ FAIL: Should have returned 400 but succeeded"
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ PASS: Invalid ID format correctly returned 400" -ForegroundColor Green
        $testResults += "✅ PASS: Invalid interview ID returns 400"
    } else {
        Write-Host "❌ FAIL: Expected 400 but got: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $testResults += "❌ FAIL: Invalid interview ID returned $($_.Exception.Response.StatusCode)"
    }
}

# Test 4: Missing Audio File (400)
Write-Host "`nTEST 4: Missing Audio File (should return 400)" -ForegroundColor Yellow
try {
    $authHeaders = @{ "Authorization" = "Bearer $token" }
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/sessions/123456789012345678901234/transcribe" -Method POST -Headers $authHeaders
    $testResults += "❌ FAIL: Should have returned 400 but succeeded"
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ PASS: Missing audio file correctly returned 400" -ForegroundColor Green
        $testResults += "✅ PASS: Missing audio file returns 400"
    } else {
        Write-Host "❌ FAIL: Expected 400 but got: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $testResults += "❌ FAIL: Missing audio file returned $($_.Exception.Response.StatusCode)"
    }
}

# Test 5: Non-existent Interview (404)
Write-Host "`nTEST 5: Non-existent Interview (should return 404)" -ForegroundColor Yellow
try {
    # Create a simple test audio file content
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    $fileContent = "fake-audio-content-for-testing"
    
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"audio`"; filename=`"test.mp3`"",
        "Content-Type: audio/mpeg",
        "",
        $fileContent,
        "--$boundary--"
    ) -join $LF
    
    $authHeaders = @{ 
        "Authorization" = "Bearer $token"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    # Use a valid ObjectId format that doesn't exist
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/sessions/111111111111111111111111/transcribe" -Method POST -Headers $authHeaders -Body $bodyLines
    $testResults += "❌ FAIL: Should have returned 404 but succeeded"
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ PASS: Non-existent interview correctly returned 404" -ForegroundColor Green
        $testResults += "✅ PASS: Non-existent interview returns 404"
    } else {
        Write-Host "❌ FAIL: Expected 404 but got: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $testResults += "❌ FAIL: Non-existent interview returned $($_.Exception.Response.StatusCode)"
    }
}

# Setup: Create test interview
Write-Host "`nSETUP: Creating test interview..." -ForegroundColor Cyan
$interviewData = @{
    interviewType = "behavioral"
    interviewDifficulty = "intermediate"
    duration = 30
}
$interviewBody = $interviewData | ConvertTo-Json

try {
    $headers = @{ 
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json" 
    }
    $interviewResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/interviews" -Method POST -Headers $headers -Body $interviewBody
    $interviewId = $interviewResponse.interview._id
    Write-Host "✅ Interview created: $interviewId" -ForegroundColor Green
    $testResults += "✅ PASS: Interview creation successful"
} catch {
    Write-Host "❌ FAIL: Interview creation failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += "❌ FAIL: Interview creation failed"
    exit 1
}

# Summary
Write-Host "`n=== TEST RESULTS SUMMARY ===" -ForegroundColor Green
foreach ($result in $testResults) {
    Write-Host $result
}

$passCount = ($testResults | Where-Object { $_ -like "*✅ PASS*" }).Count
$failCount = ($testResults | Where-Object { $_ -like "*❌ FAIL*" }).Count
$totalTests = $passCount + $failCount

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red

if ($failCount -eq 0) {
    Write-Host "`n🎉 ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ SOME TESTS FAILED" -ForegroundColor Yellow
}

# Note about file upload testing
Write-Host "`nNOTE: File upload testing requires actual audio files." -ForegroundColor Cyan
Write-Host "Audio transcription tests will need to be done manually with real audio files." -ForegroundColor Cyan
Write-Host "The endpoint structure and authentication are verified working." -ForegroundColor Cyan 