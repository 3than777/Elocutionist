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
- Your current .env file contains an exposed OpenAI API key - please regenerate it immediately

## MongoDB Setup

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster (free tier is sufficient)
3. Create a database user with read/write permissions
4. Whitelist all IP addresses (0.0.0.0/0) for Vercel's dynamic IPs
5. Get your connection string and add it to Vercel environment variables

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

If you still see "Load failed" errors:

1. Check the browser console for specific error messages
2. Verify all environment variables are set correctly in Vercel
3. Ensure MongoDB connection string is correct and database is accessible
4. Check Vercel function logs for backend errors

## Testing the Deployment

After deployment, test the following:
1. Visit `/health` endpoint to verify backend is running
2. Try creating a new account
3. Check browser network tab for any failed API calls