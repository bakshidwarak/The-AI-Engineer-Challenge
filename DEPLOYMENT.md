# Decision Tool Deployment Guide

## Overview
This guide explains how to deploy the Decision Tool to Vercel.

## Project Structure
```
The-AI-Engineer-Challenge/
├── frontend/decision-tool/     # React Vite app
├── api/                        # Python API
└── vercel.json                 # Vercel configuration
```

## Deployment Steps

### 1. Build the Application
```bash
cd frontend/decision-tool
npm run build
```

### 2. Deploy to Vercel
```bash
# From the root directory
vercel

# Or for production
vercel --prod
```

### 3. Environment Variables (if needed)
If you need to set environment variables:
```bash
vercel env add VARIABLE_NAME
```

## Configuration Files

### Root vercel.json
- Configures builds for both frontend and API
- Routes API calls to Python backend
- Routes all other requests to the React frontend

### frontend/decision-tool/vercel.json
- Specific configuration for the Vite React app
- Handles client-side routing with SPA fallback

## Features
- ✅ Conversational step-by-step decision wizard
- ✅ Interactive criteria prioritization
- ✅ Dynamic scoring matrix
- ✅ Weighted decision calculation
- ✅ Responsive design (desktop-first with mobile support)
- ✅ Modern UI with smooth animations

## Access
Once deployed, your decision tool will be available at:
`https://your-project-name.vercel.app`

## Troubleshooting

### Build Issues
1. Ensure all dependencies are installed: `npm install`
2. Check TypeScript compilation: `npm run build`
3. Verify Vite configuration is correct

### Routing Issues
1. Check that `vercel.json` routes are configured correctly
2. Ensure SPA fallback is set up for client-side routing

### API Issues
1. Verify Python API is properly configured
2. Check that API routes are correctly mapped 