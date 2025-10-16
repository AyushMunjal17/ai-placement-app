# Vercel Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Deploy Backend First

```bash
cd backend
vercel
```

**Follow the prompts:**
- Set up and deploy? **Yes**
- Which scope? Choose your account
- Link to existing project? **No**
- What's your project's name? `ai-placement-backend` (or your choice)
- In which directory is your code located? `./`
- Want to override the settings? **No**

**After deployment, note your backend URL** (e.g., `https://ai-placement-backend.vercel.app`)

### 2. Set Backend Environment Variables

Go to your Vercel dashboard → Your backend project → Settings → Environment Variables

Add these variables:
- `MONGO_URI` = Your MongoDB connection string
- `JWT_SECRET` = Your JWT secret key
- `JUDGE0_API_KEY` = Your Judge0 API key
- `JUDGE0_API_URL` = `https://judge0-ce.p.rapidapi.com`
- `NODE_ENV` = `production`

**Important:** After adding environment variables, redeploy:
```bash
vercel --prod
```

### 3. Deploy Frontend

```bash
cd ../frontend
vercel
```

**Follow the prompts:**
- Set up and deploy? **Yes**
- Which scope? Choose your account
- Link to existing project? **No**
- What's your project's name? `ai-placement-frontend` (or your choice)
- In which directory is your code located? `./`
- Want to override the settings? **No**

### 4. Set Frontend Environment Variables

Go to your Vercel dashboard → Your frontend project → Settings → Environment Variables

Add this variable:
- `VITE_BACKEND_URL` = `https://your-backend-url.vercel.app/api`

**Replace `your-backend-url` with your actual backend URL from step 1**

**After adding environment variables, redeploy:**
```bash
vercel --prod
```

### 5. Update MongoDB Atlas IP Whitelist

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Click **Network Access** in the left sidebar
3. Click **ADD IP ADDRESS**
4. Select **ALLOW ACCESS FROM ANYWHERE** (0.0.0.0/0)
5. Click **Confirm**

⚠️ **Note:** For production, you should whitelist specific IPs instead of allowing all.

### 6. Update Backend CORS (if needed)

If you encounter CORS issues, update your `backend/server.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend-url.vercel.app'
  ],
  credentials: true
}));
```

Then redeploy the backend:
```bash
cd backend
vercel --prod
```

## 🎉 Done!

Your app should now be live at:
- **Frontend:** `https://your-frontend.vercel.app`
- **Backend API:** `https://your-backend.vercel.app`

## 🔧 Troubleshooting

### Check Logs
```bash
# Backend logs
cd backend
vercel logs

# Frontend logs
cd frontend
vercel logs
```

### Redeploy
```bash
vercel --prod
```

### Common Issues

1. **Environment variables not working:**
   - Make sure you added them in Vercel dashboard
   - Redeploy after adding variables

2. **CORS errors:**
   - Update CORS settings in backend
   - Add your frontend URL to allowed origins

3. **MongoDB connection failed:**
   - Check if your IP is whitelisted in MongoDB Atlas
   - Verify your MONGO_URI is correct

4. **API calls failing:**
   - Verify VITE_BACKEND_URL is set correctly
   - Check if backend is deployed and running

## 📝 Useful Commands

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Remove deployment
vercel rm <deployment-url>
```

## 🔗 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Judge0 API Documentation](https://ce.judge0.com/)
