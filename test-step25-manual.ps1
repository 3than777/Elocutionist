Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 25 Manual Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$validObjectId = "507f1f77bcf86cd799439011"
$invalidId = "invalid-session-id"
$authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODdjMGY0ZDkyNTcxMmFlNmJiZDZmYmMiLCJlbWFpbCI6Im5ld3VzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3NTI5NjA4NDUsImV4cCI6MTc1MzA0NzI0NX0.YCBrPrnyh9xoYwTwWrMSZvtwryMZiCDza_MXUJvxGVA"

Write-Host "`n1. Testing Missing Authentication (Expected: 401)" -ForegroundColor Yellow
try {
    curl -X POST "$baseUrl/api/sessions/$validObjectId/transcript" `
        -H "Content-Type: application/json" `
        -d '{"speaker":"user","text":"Test transcript"}'
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n2. Testing Invalid Token (Expected: 401)" -ForegroundColor Yellow
try {
    curl -X POST "$baseUrl/api/sessions/$validObjectId/transcript" `
        -H "Authorization: Bearer invalid-token" `
        -H "Content-Type: application/json" `
        -d '{"speaker":"user","text":"Test transcript"}'
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n3. Testing Invalid Session ID Format (Expected: 400)" -ForegroundColor Yellow
try {
    curl -X POST "$baseUrl/api/sessions/$invalidId/transcript" `
        -H "Authorization: Bearer $authToken" `
        -H "Content-Type: application/json" `
        -d '{"speaker":"user","text":"Test transcript"}'
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n4. Testing Valid Session ID Not Found (Expected: 404)" -ForegroundColor Yellow
try {
    curl -X POST "$baseUrl/api/sessions/$validObjectId/transcript" `
        -H "Authorization: Bearer $authToken" `
        -H "Content-Type: application/json" `
        -d '{"speaker":"user","text":"Test transcript"}'
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n5. Testing Missing Speaker (Expected: 400)" -ForegroundColor Yellow
try {
    curl -X POST "$baseUrl/api/sessions/$validObjectId/transcript" `
        -H "Authorization: Bearer $authToken" `
        -H "Content-Type: application/json" `
        -d '{"text":"Test transcript"}'
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n6. Testing Invalid Confidence (Expected: 400)" -ForegroundColor Yellow
try {
    curl -X POST "$baseUrl/api/sessions/$validObjectId/transcript" `
        -H "Authorization: Bearer $authToken" `
        -H "Content-Type: application/json" `
        -d '{"speaker":"user","text":"Test","confidence":1.5}'
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Manual testing complete" -ForegroundColor Cyan
Write-Host "Please review the responses above" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan 