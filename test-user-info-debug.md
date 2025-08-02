# Debug Guide: User Info File Not Working

## Steps to Debug

### 1. Check if servers are running

Open two terminals and run:
```bash
# Terminal 1 - Backend
cd C:\Users\ethanli\Desktop\crewd
npm run dev

# Terminal 2 - Frontend  
cd C:\Users\ethanli\Desktop\crewd\dreamcollege-frontend
npm run dev
```

### 2. Open Browser Console

1. Go to http://localhost:5173
2. Open browser DevTools (F12)
3. Go to Console tab

### 3. Check Authentication

1. Make sure you're logged in
2. You should see your user info in the top right
3. In console, you should see:
   - `Upload context files:` (should show your uploaded files)
   - `Has content: true` (if you have uploaded files)

### 4. Click "Debug Files" Button

1. Look for the "Debug Files" button next to "Use uploaded content"
2. Click it and check the console
3. You should see:
   - Your user ID
   - Number of files
   - Details about each file including:
     - File name (should include "user_info")
     - Processing status (should be "completed")
     - Whether it has extracted text
     - Text preview

### 5. Send a Test Message

1. Make sure "Use uploaded content" is checked
2. Send a message like "What's my name?"
3. Check the console for:
   ```
   Sending chat request with: {
     user: true,
     token: true,
     includeUploadedContent: true,
     hasContent: true
   }
   Content metadata: { ... }
   ```

### 6. Check Backend Logs

In the backend terminal, you should see:
```
Chat request - Content: true, Type: general
User authenticated: true, User ID: [your-user-id]
Authorization header: Present

=== CONTENT INTEGRATION DEBUG ===
Content requested: YES
User available: true
Attempting to load content for user: [your-user-id]
Found X uploaded files for user [your-user-id]:
- user_info.pdf (document): XXX chars
```

## Common Issues

### Issue 1: User not authenticated
- Solution: Log out and log back in
- Check if token is stored in localStorage

### Issue 2: Files not found
- Solution: Re-upload the user_info file
- Make sure upload was successful

### Issue 3: File not processed
- Solution: Check if file status is "completed"
- Wait for processing to finish after upload

### Issue 4: Content not included
- Solution: Check "Use uploaded content" checkbox
- Make sure you're logged in when sending messages

## What to Report

Please share:
1. Console output when clicking "Debug Files"
2. Console output when sending a message
3. Backend terminal output
4. Whether the AI mentions your name or info from the file 