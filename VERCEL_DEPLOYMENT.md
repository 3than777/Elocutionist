# Vercel Deployment Instructions

## Environment Variables Setup

You need to configure the following environment variables in your Vercel project:

### Frontend Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variable:

```
VITE_API_URL = /api
```

This tells the frontend to use the same domain for API calls, which will be routed to your serverless functions.

### Backend Environment Variables

Add these required environment variables in Vercel:

```
MONGODB_URI = your-mongodb-connection-string
JWT_SECRET = your-secure-jwt-secret
OPENAI_API_KEY = your-openai-api-key
```

⚠️ **SECURITY WARNING**: 
- Never commit API keys to your repository
- Generate a new JWT_SECRET for production (use: `openssl rand -hex 64`)
- If you've committed any API keys, regenerate them immediately in your provider's dashboard
- Use Vercel's environment variables for all sensitive data

## MongoDB Setup

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster (free tier is sufficient)
3. Create a database user with read/write permissions
4. **CRITICAL**: Whitelist all IP addresses (0.0.0.0/0) for Vercel's dynamic IPs
   - Go to Network Access in MongoDB Atlas
   - Click "Add IP Address"
   - Select "Allow Access from Anywhere"
   - This is required because Vercel uses dynamic IPs
5. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user's password
   - Add to Vercel as `MONGODB_URI`

Example connection string:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ai-interview-coach?retryWrites=true&w=majority
```

## CORS Configuration Update

For production, update your backend CORS configuration in `src/index.ts`:

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-app.vercel.app',
  credentials: true
}));
```

Then add `FRONTEND_URL` to your Vercel environment variables:
```
FRONTEND_URL = https://your-deployed-app.vercel.app
```

## Deployment Steps

1. Push all changes to GitHub
2. In Vercel, import your GitHub repository
3. Configure environment variables as listed above
4. Deploy

## Troubleshooting

### AI Interview Not Working / "Sorry, I encountered an error starting the interview"

This error typically means the OpenAI integration is failing. Check:

1. **OpenAI API Key**:
   - Ensure `OPENAI_API_KEY` is set in Vercel environment variables
   - Verify the key starts with `sk-` and is valid
   - Check your OpenAI account has available credits
   - Test the key at https://platform.openai.com/api-keys

2. **Frontend API URL**:
   - Verify `VITE_API_URL` is set correctly in Vercel
   - For production, it should be empty or set to your Vercel app URL
   - The frontend will use relative paths `/api` if not set

3. **Check Function Logs**:
   - Go to Vercel dashboard → Functions tab
   - Look for errors in the `/api/chat` endpoint
   - Common issues: Invalid API key, rate limits, network errors

4. **Verify Environment Variables**:
   ```
   OPENAI_API_KEY = sk-proj-...
   MONGODB_URI = mongodb+srv://...
   JWT_SECRET = your-secure-secret
   VITE_API_URL = https://your-app.vercel.app
   ```

### "Registration service temporarily unavailable" Error

This error usually means MongoDB connection is failing. Check:

1. **MongoDB Atlas Network Access**:
   - Ensure 0.0.0.0/0 is whitelisted
   - Check if your cluster is active (not paused)

2. **Environment Variables**:
   - Verify `MONGODB_URI` is set correctly in Vercel
   - Check that the password in the URI is correct
   - Ensure there are no spaces or quotes in the value

3. **Check Vercel Function Logs**:
   - Go to your Vercel project → Functions tab
   - Click on `api/index` to see logs
   - Look for MongoDB connection errors

4. **Test the Health Endpoint**:
   - Visit `https://your-app.vercel.app/api/health`
   - Should show database connection status

### Other Common Issues

1. **CORS errors**: Make sure `FRONTEND_URL` environment variable matches your Vercel app URL
2. **404 errors on API calls**: Ensure `VITE_API_URL` is set to `/api`
3. **JWT errors**: Generate a proper `JWT_SECRET` for production

## Testing the Deployment

After deployment, test the following:
1. Visit `/api/health` endpoint to verify backend is running
2. Try creating a new account
3. Check browser network tab for any failed API calls
4. Check Vercel function logs for any errors