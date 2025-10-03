# Vercel Environment Variables Checklist

Since the app works on localhost but not on Vercel, you need to set these environment variables in your Vercel project settings:

## Required Environment Variables

### 1. **OPENAI_API_KEY** ⚠️ MOST IMPORTANT
- **What**: Your OpenAI API key for GPT-4
- **Where to get**: https://platform.openai.com/api-keys
- **Format**: Should start with `sk-`
- **Example**: `sk-proj-abc123...`

### 2. **MONGODB_URI**
- **What**: MongoDB connection string
- **Where to get**: MongoDB Atlas dashboard
- **Format**: `mongodb+srv://username:password@cluster.mongodb.net/dbname`
- **Note**: Make sure to whitelist 0.0.0.0/0 in MongoDB Atlas for Vercel

### 3. **JWT_SECRET**
- **What**: Secret key for JWT tokens
- **Generate**: Run `openssl rand -hex 32` in terminal
- **Example**: `a3f5b9c2d8e1f7a4b6c3d9e5f2a8b4c1d7e3f9a5b2c8d4e1f6a3b9c5d2e8f4a1`

### 4. **VITE_API_URL** (Optional)
- **What**: Leave empty or unset for production
- **Why**: The app will use relative paths automatically

## How to Set in Vercel

1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables" in the left sidebar
4. For each variable:
   - Enter the Key (e.g., `OPENAI_API_KEY`)
   - Enter the Value (your actual API key)
   - Select all environments (Production, Preview, Development)
   - Click "Save"

## Quick Debug Steps

1. **Check if variables are set**:
   - Go to Vercel dashboard → Functions tab
   - Click on any function (e.g., `/api/chat`)
   - Check the logs for errors about missing API keys

2. **Common issues**:
   - **"OPENAI_API_KEY environment variable is not configured"** → Set OPENAI_API_KEY
   - **"401 Unauthorized"** → Your OpenAI API key might be invalid
   - **"MongoDB connection failed"** → Check MONGODB_URI and network access

3. **After setting variables**:
   - Redeploy your application (Vercel → Deployments → Redeploy)

## Test After Setup

Visit your deployed URL and try:
1. Starting a new interview
2. If it still shows errors, check Vercel function logs for specific error messages