# Test script for debugging chat content integration
# This script tests the complete flow from login to chat with uploaded content

$API_URL = "http://localhost:3000/api"

Write-Host "`n=== CHAT CONTENT INTEGRATION TEST ===" -ForegroundColor Yellow
Write-Host "This script will test why AI is not referencing uploaded content`n" -ForegroundColor Yellow

# Step 1: Login
Write-Host "`n[1] Testing Login..." -ForegroundColor Cyan
$loginBody = @{
    email = "ethan@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    $userId = $loginResponse.user._id
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "  User ID: $userId" -ForegroundColor Gray
    Write-Host "  Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Check uploaded files
Write-Host "`n[2] Checking uploaded files..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $filesResponse = Invoke-RestMethod -Uri "$API_URL/chat/debug-files" -Method GET -Headers $headers
    Write-Host "✓ Files check successful" -ForegroundColor Green
    Write-Host "  Total files: $($filesResponse.fileCount)" -ForegroundColor Gray
    
    if ($filesResponse.fileCount -gt 0) {
        foreach ($file in $filesResponse.files) {
            Write-Host "`n  File: $($file.name)" -ForegroundColor White
            Write-Host "    - ID: $($file.id)" -ForegroundColor Gray
            Write-Host "    - Type: $($file.type)" -ForegroundColor Gray
            Write-Host "    - Status: $($file.status)" -ForegroundColor Gray
            Write-Host "    - Has text: $($file.hasText)" -ForegroundColor Gray
            Write-Host "    - Text length: $($file.textLength) chars" -ForegroundColor Gray
            if ($file.textPreview) {
                Write-Host "    - Preview: $($file.textPreview.Substring(0, [Math]::Min(50, $file.textPreview.Length)))..." -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "  WARNING: No files found for user!" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Files check failed: $_" -ForegroundColor Red
}

# Step 3: Test authentication status
Write-Host "`n[3] Testing authentication status..." -ForegroundColor Cyan
try {
    $authTestResponse = Invoke-RestMethod -Uri "$API_URL/chat/test-auth" -Method GET -Headers $headers
    Write-Host "✓ Auth test successful" -ForegroundColor Green
    Write-Host "  Authenticated: $($authTestResponse.authenticated)" -ForegroundColor Gray
    Write-Host "  User ID: $($authTestResponse.userId)" -ForegroundColor Gray
    Write-Host "  User name: $($authTestResponse.userName)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Auth test failed: $_" -ForegroundColor Red
}

# Step 4: Test chat WITHOUT uploaded content
Write-Host "`n[4] Testing chat WITHOUT uploaded content..." -ForegroundColor Cyan
$chatBody = @{
    messages = @(
        @{
            role = "system"
            content = "You are an AI interview coach helping students prepare for college admissions interviews."
        },
        @{
            role = "user"
            content = "Tell me about yourself."
        }
    )
    includeUploadedContent = $false
    interviewType = "general"
} | ConvertTo-Json -Depth 10

try {
    $chatResponse = Invoke-RestMethod -Uri "$API_URL/chat" -Method POST -Body $chatBody -ContentType "application/json" -Headers $headers
    Write-Host "✓ Chat without content successful" -ForegroundColor Green
    Write-Host "  Content used: $($chatResponse.contentUsed)" -ForegroundColor Gray
    Write-Host "  Response preview: $($chatResponse.message.Substring(0, [Math]::Min(100, $chatResponse.message.Length)))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Chat without content failed: $_" -ForegroundColor Red
}

# Step 5: Test chat WITH uploaded content
Write-Host "`n[5] Testing chat WITH uploaded content..." -ForegroundColor Cyan
$chatBodyWithContent = @{
    messages = @(
        @{
            role = "system"
            content = "You are an AI interview coach helping students prepare for college admissions interviews."
        },
        @{
            role = "user"
            content = "Tell me about yourself."
        }
    )
    includeUploadedContent = $true
    interviewType = "general"
    maxContentTokens = 2000
} | ConvertTo-Json -Depth 10

try {
    Write-Host "  Sending request with includeUploadedContent=true..." -ForegroundColor Gray
    $chatWithContentResponse = Invoke-RestMethod -Uri "$API_URL/chat" -Method POST -Body $chatBodyWithContent -ContentType "application/json" -Headers $headers
    Write-Host "✓ Chat with content successful" -ForegroundColor Green
    Write-Host "  Content used: $($chatWithContentResponse.contentUsed)" -ForegroundColor Gray
    
    if ($chatWithContentResponse.contentMetadata) {
        $meta = $chatWithContentResponse.contentMetadata
        Write-Host "  Content metadata:" -ForegroundColor Gray
        Write-Host "    - Content requested: $($meta.contentRequested)" -ForegroundColor Gray
        Write-Host "    - User authenticated: $($meta.userAuthenticated)" -ForegroundColor Gray
        Write-Host "    - Files found: $($meta.filesFound)" -ForegroundColor Gray
        Write-Host "    - Files used: $($meta.filesUsed)" -ForegroundColor Gray
    }
    
    Write-Host "`n  Response preview:" -ForegroundColor Gray
    Write-Host "  $($chatWithContentResponse.message.Substring(0, [Math]::Min(200, $chatWithContentResponse.message.Length)))..." -ForegroundColor White
    
    # Check if response references user content
    $referencePhrases = @("based on your", "see you", "notice you", "your background", "your experience")
    $hasReference = $false
    foreach ($phrase in $referencePhrases) {
        if ($chatWithContentResponse.message -like "*$phrase*") {
            $hasReference = $true
            break
        }
    }
    
    if ($hasReference) {
        Write-Host "`n  ✓ Response appears to reference user content!" -ForegroundColor Green
    } else {
        Write-Host "`n  ✗ Response does NOT appear to reference user content" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Chat with content failed: $_" -ForegroundColor Red
}

# Step 6: Get content summary
Write-Host "`n[6] Getting content summary..." -ForegroundColor Cyan
try {
    $summaryResponse = Invoke-RestMethod -Uri "$API_URL/chat/content-summary" -Method GET -Headers $headers
    Write-Host "✓ Content summary successful" -ForegroundColor Green
    Write-Host "  Has content: $($summaryResponse.hasContent)" -ForegroundColor Gray
    
    if ($summaryResponse.hasContent) {
        Write-Host "  File count: $($summaryResponse.fileCount)" -ForegroundColor Gray
        Write-Host "  Summary preview: $($summaryResponse.summary.Substring(0, [Math]::Min(100, $summaryResponse.summary.Length)))..." -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Content summary failed: $_" -ForegroundColor Red
}

# Step 7: Run comprehensive diagnostics
Write-Host "`n[7] Running comprehensive content diagnostics..." -ForegroundColor Cyan
try {
    $diagResponse = Invoke-RestMethod -Uri "$API_URL/chat/diagnose-content" -Method GET -Headers $headers
    Write-Host "✓ Diagnostics successful" -ForegroundColor Green
    
    Write-Host "`n  File Analysis:" -ForegroundColor White
    Write-Host "    Total files: $($diagResponse.files.total)" -ForegroundColor Gray
    Write-Host "    With text: $($diagResponse.files.withText)" -ForegroundColor Gray
    Write-Host "    Without text: $($diagResponse.files.withoutText)" -ForegroundColor Gray
    
    if ($diagResponse.files.byStatus) {
        Write-Host "`n  Files by status:" -ForegroundColor White
        $diagResponse.files.byStatus.PSObject.Properties | ForEach-Object {
            Write-Host "    $($_.Name): $($_.Value)" -ForegroundColor Gray
        }
    }
    
    Write-Host "`n  Content Integration:" -ForegroundColor White
    Write-Host "    Can load content: $($diagResponse.contentIntegration.canLoadContent)" -ForegroundColor Gray
    Write-Host "    Content length: $($diagResponse.contentIntegration.contentLength) chars" -ForegroundColor Gray
    
    if ($diagResponse.contentIntegration.errors -and $diagResponse.contentIntegration.errors.Count -gt 0) {
        Write-Host "`n  Integration Errors:" -ForegroundColor Red
        foreach ($err in $diagResponse.contentIntegration.errors) {
            Write-Host "    - $err" -ForegroundColor Red
        }
    }
    
    if ($diagResponse.recommendations -and $diagResponse.recommendations.Count -gt 0) {
        Write-Host "`n  Recommendations:" -ForegroundColor Yellow
        foreach ($rec in $diagResponse.recommendations) {
            Write-Host "    - $rec" -ForegroundColor Yellow
        }
    }
    
    # Save full diagnostics to file for debugging
    $diagResponse | ConvertTo-Json -Depth 10 | Out-File "content-diagnostics-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    Write-Host "`n  Full diagnostics saved to content-diagnostics-*.json" -ForegroundColor Gray
    
} catch {
    Write-Host "✗ Diagnostics failed: $_" -ForegroundColor Red
}

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Yellow
Write-Host "Check the backend logs for detailed debugging information." -ForegroundColor Yellow 