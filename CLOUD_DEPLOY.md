# ☁️ Cloud Deployment Guide (No Docker Required)

## 🚀 Quick Deploy Options

### 1. Railway (Recommended - Easiest)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your VideoHarvester repository
5. Railway will automatically detect and deploy your app
6. Your app will be live at a Railway URL

### 2. Render
1. Go to [render.com](https://render.com)
2. Sign up and connect your GitHub
3. Click "New Web Service"
4. Select your repository
5. Set build command: `npm run build`
6. Set start command: `npm start`
7. Deploy!

### 3. Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 4. Netlify
1. Go to [netlify.com](https://netlify.com)
2. Connect your GitHub repo
3. Set build command: `npm run build`
4. Set publish directory: `dist/public`
5. Deploy!

### 5. Heroku
```bash
# Install Heroku CLI
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create app
heroku create your-videoharvester-app

# Deploy
git push heroku main
```

## 🔧 Platform-Specific Configuration

### Railway Configuration
Create `railway.json` in your project root:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Render Configuration
Create `render.yaml` in your project root:
```yaml
services:
  - type: web
    name: videoharvester
    env: node
    buildCommand: npm run build
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
```

### Vercel Configuration
Create `vercel.json` in your project root:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ]
}
```

## 📋 Pre-Deployment Checklist

Before deploying to any platform:

1. **✅ Test your build locally**
   ```bash
   npm run build
   npm start
   ```

2. **✅ Check your app works**
   - Open http://localhost:5000
   - Test video download functionality

3. **✅ Environment variables**
   - Set `NODE_ENV=production`
   - Set `PORT` (most platforms auto-detect)

4. **✅ Dependencies**
   - All dependencies are in `package.json`
   - Build script is working

## 🌐 Your App Features Ready for Cloud

- ✅ **Multi-platform video downloading** (YouTube, Instagram, TikTok, etc.)
- ✅ **High-quality downloads** (up to 4K)
- ✅ **Batch download mode**
- ✅ **Real-time progress tracking**
- ✅ **Beautiful responsive UI**
- ✅ **Dark/light mode**
- ✅ **Advanced download options**

## 🚀 Recommended: Railway Deployment

Railway is the easiest option because:
- ✅ Automatic deployment from GitHub
- ✅ No configuration needed
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Real-time logs

### Steps for Railway:
1. Push your code to GitHub
2. Go to [railway.app](https://railway.app)
3. Connect your GitHub account
4. Click "New Project" → "Deploy from GitHub repo"
5. Select your VideoHarvester repository
6. Wait for deployment (usually 2-3 minutes)
7. Your app will be live!

## 🔍 Post-Deployment

After deploying:
1. **Test your app** at the provided URL
2. **Test video downloads** with a simple YouTube video
3. **Check logs** if anything doesn't work
4. **Set up custom domain** (optional)
5. **Configure environment variables** if needed

## 🛠️ Troubleshooting

### Common Issues:
1. **Build fails**
   - Check if all dependencies are in `package.json`
   - Ensure `npm run build` works locally

2. **App doesn't start**
   - Check if `npm start` works locally
   - Verify the start command in platform settings

3. **Downloads don't work**
   - Some platforms may have restrictions on file system access
   - Consider using cloud storage for downloads

4. **WebSocket issues**
   - Some platforms may not support WebSocket
   - Check platform documentation

## 📞 Support

If you encounter issues:
1. Check the platform's documentation
2. Review the logs in your platform dashboard
3. Test locally first to isolate issues
4. Check the troubleshooting section above

---

**Your VideoHarvester app is ready for the cloud! 🎉** 