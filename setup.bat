@echo off
REM Gyandeep Web-Based Installation Script for Windows
REM This script sets up everything needed for web-based deployment

echo.
echo ========================================
echo 🚀 Gyandeep Web-Based Setup (Windows)
echo ========================================
echo.

REM Check Node.js installation
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js 16+ from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% found
echo.

REM Check npm installation
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm %NPM_VERSION% found
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo.

REM Create .env.local if it doesn't exist
if exist .env.local (
    echo ✅ .env.local already exists
) else (
    echo 🔐 Creating .env.local file...
    echo.
    set /p GEMINI_KEY="Enter your Gemini API Key (get from https://aistudio.google.com/): "
    
    if "%GEMINI_KEY%"=="" (
        echo ❌ API Key is required!
        pause
        exit /b 1
    )
    
    (
        echo GEMINI_API_KEY=%GEMINI_KEY%
        echo PORT=3000
        echo NODE_ENV=production
    ) > .env.local
    
    echo ✅ .env.local created
    echo.
)

REM Build project
echo 🏗️  Building project...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)
echo.

REM Success message
echo ✅ Setup complete!
echo.
echo 🎉 Gyandeep is ready to run!
echo.
echo To start the server, run:
echo   npm start
echo.
echo Then visit: http://localhost:3000
echo.
pause
