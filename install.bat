@echo off
echo Installing WebM to MP4 Converter...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not available.
    echo Please make sure Node.js is properly installed.
    echo.
    pause
    exit /b 1
)

echo Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo.
    echo Error: Failed to install dependencies.
    echo Please check your internet connection and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo Installation completed successfully!
echo.
echo To start the application, run: npm start
echo To build the application, run: npm run build
echo.
pause
