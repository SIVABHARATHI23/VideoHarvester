# 🚀 VideoHarvester Release Guide

## Quick Start

### Option 1: Docker Deployment (Recommended)
```bash
# Run the deployment script
./deploy.sh  # Linux/Mac
deploy.bat   # Windows
```

### Option 2: Manual Deployment
```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the production server
npm start
```

## 🌐 Deployment Options

### 1. Local Development
```bash
npm run dev
```
Access at: http://localhost:5000

### 2. Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build -d

# Or build manually
docker build -t videoharvester .
docker run -p 5000:5000 -v $(pwd)/Downloads:/app/Downloads videoharvester
```

### 3. Cloud Deployment

#### Heroku
```bash
# Install Heroku CLI
heroku create your-app-name
git push heroku main
```

#### Railway
```bash
# Connect your GitHub repo to Railway
# Railway will auto-deploy on push
```

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel
vercel --prod
```

#### DigitalOcean App Platform
- Connect your GitHub repository
- Set build command: `npm run build`
- Set run command: `npm start`
- Set environment variables as needed

### 4. VPS Deployment
```bash
# On your VPS
git clone <your-repo>
cd VideoHarvester
npm install
npm run build
npm start

# Or with PM2
npm install -g pm2
pm2 start dist/index.js --name videoharvester
pm2 startup
pm2 save
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=production
PORT=5000
# Add any other environment variables you need
```

## 📁 File Structure After Build

```
VideoHarvester/
├── dist/
│   ├── index.js          # Server bundle
│   └── public/           # Client bundle
│       ├── index.html
│       └── assets/
├── Downloads/            # Download directory
├── cookies/             # Cookie files
├── Dockerfile
├── docker-compose.yml
└── deploy.sh
```

## 🐳 Docker Commands

```bash
# Build image
docker build -t videoharvester .

# Run container
docker run -p 5000:5000 -v $(pwd)/Downloads:/app/Downloads videoharvester

# View logs
docker logs <container-id>

# Stop container
docker stop <container-id>
```

## 🔍 Health Check

The application includes a health check endpoint:
- URL: `http://localhost:5000/health`
- Expected response: `200 OK`

## 📊 Monitoring

### Logs
```bash
# Docker logs
docker-compose logs -f

# PM2 logs
pm2 logs videoharvester
```

### Performance
- Monitor CPU and memory usage
- Check download queue status
- Monitor disk space for downloads

## 🛠️ Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port 5000
   lsof -i :5000
   # Kill the process
   kill -9 <PID>
   ```

2. **Docker build fails**
   ```bash
   # Clean Docker cache
   docker system prune -a
   # Rebuild
   docker-compose build --no-cache
   ```

3. **Downloads not working**
   - Check if yt-dlp is installed
   - Verify internet connectivity
   - Check if cookies are properly configured

4. **WebSocket connection issues**
   - Ensure the server is running
   - Check firewall settings
   - Verify WebSocket URL in client

## 🔒 Security Considerations

1. **Environment Variables**
   - Never commit `.env` files
   - Use secure environment variables in production

2. **File Permissions**
   - Ensure proper file permissions for Downloads directory
   - Use non-root user in Docker containers

3. **Network Security**
   - Use HTTPS in production
   - Configure proper CORS settings
   - Implement rate limiting if needed

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale with Docker Compose
docker-compose up --scale videoharvester=3

# Or with Kubernetes
kubectl scale deployment videoharvester --replicas=3
```

### Load Balancing
- Use nginx as reverse proxy
- Configure sticky sessions for WebSocket connections
- Implement proper session management

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Log rotation configured
- [ ] Security headers added
- [ ] Rate limiting implemented
- [ ] Error tracking configured
- [ ] Performance monitoring enabled

## 📞 Support

For issues and questions:
- Check the README.md for detailed documentation
- Review the troubleshooting section above
- Open an issue on GitHub
- Contact the maintainer

---

**Happy downloading! 🎉** 