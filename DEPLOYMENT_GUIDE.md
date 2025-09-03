# CampusKart Deployment Guide

## Free Deployment Setup

### Prerequisites
- GitHub account
- Vercel account (free)
- Railway account (free)

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

### 1.2 Deploy Backend
1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub repository
4. Railway will automatically detect the Node.js app

### 1.3 Set Environment Variables in Railway
Add these environment variables in Railway dashboard:

```
DATABASE_URL=your_railway_postgresql_url
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
PORT=5000
NODE_ENV=production
```

### 1.4 Add PostgreSQL Database
1. In Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will provide the DATABASE_URL automatically

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your GitHub repository

### 2.2 Deploy Frontend
1. In Vercel dashboard, click "New Project"
2. Import your GitHub repository
3. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: npm run build
   - Output Directory: .next

### 2.3 Set Environment Variables in Vercel
Add this environment variable in Vercel dashboard:

```
NEXT_PUBLIC_API_URL=https://your-railway-app-url.railway.app
```

## Step 3: Update Frontend API URL

After getting your Railway backend URL, update the frontend to use it:

1. In Vercel dashboard, go to your project settings
2. Add environment variable:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-railway-app-url.railway.app`

## Step 4: Test Deployment

1. Visit your Vercel frontend URL
2. Test user registration and login
3. Test seller registration
4. Test product browsing and requests

## Troubleshooting

### Database Issues
- Make sure DATABASE_URL is set correctly in Railway
- Check Railway logs for database connection errors

### API Connection Issues
- Verify NEXT_PUBLIC_API_URL is set correctly in Vercel
- Check that Railway backend is running
- Test API endpoints directly

### Build Issues
- Check Vercel build logs
- Ensure all dependencies are in package.json
- Verify TypeScript compilation

## Free Tier Limits

### Railway Free Tier:
- 500 hours/month
- 1GB RAM
- Shared CPU
- PostgreSQL database included

### Vercel Free Tier:
- Unlimited deployments
- 100GB bandwidth/month
- Automatic HTTPS
- Custom domains

## Cost Optimization

1. **Railway**: Monitor usage to stay within free tier
2. **Vercel**: Free tier is generous, no optimization needed
3. **Database**: Railway PostgreSQL is included in free tier

## Next Steps After Deployment

1. Set up custom domain (optional)
2. Configure email notifications
3. Set up monitoring
4. Add payment system (future enhancement)
