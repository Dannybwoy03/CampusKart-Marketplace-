# Quick Deployment Checklist

## Before Deployment

### 1. Commit All Changes
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Test Locally
```bash
# Test backend
cd server
npm install
npm run dev

# Test frontend (in new terminal)
npm install
npm run dev
```

## Deployment Steps

### Step 1: Railway (Backend)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add PostgreSQL database in Railway
6. Set environment variables (see DEPLOYMENT_GUIDE.md)
7. Get your Railway URL (e.g., https://your-app.railway.app)

### Step 2: Vercel (Frontend)
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project" → Import your repository
4. Set environment variable:
   - NEXT_PUBLIC_API_URL=https://your-app.railway.app
5. Deploy

### Step 3: Test Everything
1. Visit your Vercel URL
2. Test user registration
3. Test seller registration
4. Test product browsing
5. Test request system

## Environment Variables Needed

### Railway (Backend)
- DATABASE_URL (Railway provides this)
- JWT_SECRET (generate a random string)
- EMAIL_USER (your Gmail)
- EMAIL_PASS (Gmail app password)
- CLOUDINARY_CLOUD_NAME (optional for now)
- CLOUDINARY_API_KEY (optional for now)
- CLOUDINARY_API_SECRET (optional for now)
- PORT=5000
- NODE_ENV=production

### Vercel (Frontend)
- NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app

## Quick Commands

```bash
# Test everything locally first
npm run dev
cd server && npm run dev

# Then deploy
git add .
git commit -m "Ready for deployment"
git push origin main
```
