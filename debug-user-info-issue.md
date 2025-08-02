# Debug Guide: User Info Not Being Included

## New Debug Features Added

I've added several debugging features to help identify the exact issue:

1. **Test Auth Button** (Green) - Tests if authentication is working
2. **Enhanced Console Logging** - Shows exactly what's being sent
3. **Backend Debug Logs** - Shows what the server receives

## Steps to Debug

### 1. Refresh Your Browser
Press Ctrl+F5 or Cmd+Shift+R to ensure you have the latest code

### 2. Click "Test Auth" Button
This new green button will test your authentication. Check console for output like:
```
Auth test result: {
  authenticated: true,
  userId: "your-user-id",
  userIdType: "object",
  userName: "Your Name"
}
```

### 3. Click "Debug Files" Button
Check if your files show up with:
- `status: "completed"`
- `hasText: true`

### 4. Send a Test Message
Send "What's my name?" and watch for:

**In Browser Console:**
```
Full request details: {
  url: "http://localhost:3000/api/chat",
  authHeader: "Bearer your-token",
  body: {
    includeUploadedContent: true,
    ...
  },
  userObject: { ... }
}
```

**In Backend Terminal:**
```
=== PRE-CONTENT CHECK ===
includeUploadedContent: true
req.user exists: true
req.user._id: your-user-id

Querying UploadedFile with criteria: {
  userId: "your-user-id",
  processingStatus: "completed"
}
Query result: X files found
```

## Common Issues & Solutions

### Issue 1: "Query result: 0 files found"
This means the user ID doesn't match. Check:
- What user ID is shown in "Test Auth"?
- What user ID is shown in "Debug Files"?
- Do they match?

### Issue 2: "req.user exists: false"
This means authentication isn't working. Check:
- Is the token being sent? (check "Full request details" log)
- Try logging out and back in

### Issue 3: Files exist but no extracted text
Check "Debug Files" output - if `hasText: false`, the file needs reprocessing

## Quick Fix Attempts

1. **Clear Everything and Start Fresh:**
   ```javascript
   // In browser console:
   localStorage.clear();
   location.reload();
   ```
   Then login and re-upload your file

2. **Force Refresh Files:**
   - Click "Refresh Files" button after login
   - Wait 2 seconds
   - Click "Debug Files" to verify

3. **Check File Processing:**
   If file shows `processing` status, wait 10 seconds and click "Refresh Files" again

## What to Report Back

Please share:
1. Output from "Test Auth" button
2. Output from "Debug Files" button  
3. The backend terminal output when you send a message
4. Any error messages in red in the console

This will tell us exactly where the disconnect is happening. 