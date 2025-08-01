@echo off
echo 🚀 Starting VideoHarvester deployment...

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

REM Create necessary directories
echo 📁 Creating directories...
if not exist "Downloads" mkdir Downloads
if not exist "cookies" mkdir cookies

REM Build and start the application
echo 🔨 Building and starting VideoHarvester...
docker-compose up --build -d

REM Wait for the application to start
echo ⏳ Waiting for application to start...
timeout /t 10 /nobreak >nul

REM Check if the application is running
curl -f http://localhost:5000/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Application failed to start. Check logs with: docker-compose logs
    pause
    exit /b 1
) else (
    echo ✅ VideoHarvester is running successfully!
    echo 🌐 Open your browser and go to: http://localhost:5000
    echo 📁 Downloads will be saved to: ./Downloads
    echo.
    echo 📋 Useful commands:
    echo   - View logs: docker-compose logs -f
    echo   - Stop app: docker-compose down
    echo   - Restart app: docker-compose restart
)

pause 