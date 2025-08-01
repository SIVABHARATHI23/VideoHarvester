@echo off
echo 🚀 Starting VideoHarvester deployment (No Docker Required)...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Build the application
echo 🔨 Building the application...
npm run build

REM Create necessary directories
echo 📁 Creating directories...
if not exist "Downloads" mkdir Downloads
if not exist "cookies" mkdir cookies

REM Start the application
echo 🚀 Starting VideoHarvester...
echo.
echo ✅ VideoHarvester is now running!
echo 🌐 Open your browser and go to: http://localhost:5000
echo 📁 Downloads will be saved to: ./Downloads
echo.
echo 📋 To stop the app, press Ctrl+C
echo 📋 To deploy to cloud, see CLOUD_DEPLOY.md
echo.

npm start 