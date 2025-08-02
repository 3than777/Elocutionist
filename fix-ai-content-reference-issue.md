# Fix AI Content Reference Issue

## Problem
The AI is not able to reference uploaded user information during chat conversations.

## Diagnosis Steps

### 1. Run the Test Script
```powershell
.\test-chat-content-integration.ps1
```

This script will:
- Login as a test user
- Check uploaded files
- Test authentication
- Test chat with and without content
- Run comprehensive diagnostics

### 2. Check Backend Logs
The backend now has detailed logging for content integration. Look for these log sections:
- `=== CHAT REQUEST DEBUG ===`
- `=== PRE-CONTENT CHECK ===`
- `=== CONTENT INTEGRATION DEBUG ===`
- `=== DATABASE QUERY ===`
- `=== NO FILES FOUND - DEBUGGING ===`
- `=== FILES FOUND - PROCESSING ===`
- `=== CONTENT INTEGRATION ===`
- `=== CONTENT ADDED TO PROMPT ===`

### 3. Use Diagnostic Endpoints

#### Debug Files Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/chat/debug-files
```

#### Content Summary Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/chat/content-summary
```

#### Comprehensive Diagnostics Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/chat/diagnose-content
```

## Common Issues and Solutions

### Issue 1: No Files Found
**Symptoms:**
- `Query result: 0 files found` in logs
- `Total files: 0` in diagnostics

**Solutions:**
1. Ensure files are uploaded for the user
2. Check that files have `processingStatus: 'completed'`
3. Verify files have `extractedText` field populated

### Issue 2: Authentication Issues
**Symptoms:**
- `User authenticated: false` in logs
- `WARNING: Content requested but user not authenticated!`

**Solutions:**
1. Ensure JWT token is being sent in Authorization header
2. Check token is valid and not expired
3. Verify user exists in database

### Issue 3: Content Not Being Added to Prompt
**Symptoms:**
- Files found but `System message not found in messages array!`
- Content loaded but not added to AI prompt

**Solutions:**
1. Ensure system message is included in chat request
2. Check system message is at correct index
3. Verify message structure matches expected format

### Issue 4: Frontend Not Requesting Content
**Symptoms:**
- `includeUploadedContent: false` in logs
- Content integration skipped

**Solutions:**
1. Check "Use uploaded content" checkbox is enabled in UI
2. Verify `useUploadedContent` state in ChatBox component
3. Ensure `hasContent` is true (files are loaded)

## Testing Checklist

- [ ] User is logged in with valid JWT token
- [ ] Files are uploaded for the user
- [ ] Files have status 'completed' with extracted text
- [ ] Frontend shows uploaded files in the UI
- [ ] "Use uploaded content" checkbox is enabled
- [ ] Chat request includes `includeUploadedContent: true`
- [ ] System message exists in the messages array
- [ ] Backend logs show content being added to prompt
- [ ] AI response references user information

## Quick Fix Steps

1. **Restart Backend**
   ```bash
   npm run dev
   ```

2. **Clear Browser Storage**
   - Open DevTools (F12)
   - Go to Application tab
   - Clear Local Storage

3. **Re-login**
   - Logout and login again
   - This ensures fresh JWT token

4. **Re-upload Files**
   - Upload a test file with user information
   - Wait for processing to complete
   - Refresh files in UI

5. **Test Chat**
   - Enable "Use uploaded content"
   - Ask: "Tell me about yourself"
   - Check if AI references your information

## Expected Behavior

When working correctly:
1. User uploads files containing personal information
2. Files are processed and text is extracted
3. User enables "Use uploaded content" in chat
4. AI responses reference the uploaded information
5. Responses include phrases like:
   - "Based on your background..."
   - "I see you have experience with..."
   - "According to your documents..."

## Debug Commands

### Check MongoDB for Files
```javascript
// In MongoDB shell or Compass
db.uploadedfiles.find({ userId: ObjectId("USER_ID") })
```

### Test File Processing
```bash
# Upload a test file
curl -X POST http://localhost:3000/api/uploads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@test-user-info.txt"
```

### Manual Content Check
```bash
# Get user's content
curl http://localhost:3000/api/chat/content-summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Contact
If issues persist after following these steps, check:
1. OpenAI API key is valid
2. MongoDB connection is stable
3. No errors in backend console
4. Browser console for frontend errors 