# Quick Deployment Commands

## Step 1: Deploy Backend
```powershell
cd E:\ai-appp\backend
vercel
```

## Step 2: Set Backend Environment Variables in Vercel Dashboard
- Go to: https://vercel.com/dashboard
- Select your backend project
- Settings → Environment Variables
- Add:
  - MONGO_URI
  - JWT_SECRET
  - JUDGE0_API_KEY
  - JUDGE0_API_URL
  - NODE_ENV=production

## Step 3: Redeploy Backend with Environment Variables
```powershell
cd E:\ai-appp\backend
vercel --prod
```

## Step 4: Deploy Frontend
```powershell
cd E:\ai-appp\frontend
vercel
```

## Step 5: Set Frontend Environment Variable
- Go to: https://vercel.com/dashboard
- Select your frontend project
- Settings → Environment Variables
- Add:
  - VITE_BACKEND_URL=https://your-backend-url.vercel.app/api

## Step 6: Redeploy Frontend
```powershell
cd E:\ai-appp\frontend
vercel --prod
```

## Done! 🎉
Your app is now live!
