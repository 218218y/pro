@echo off
title Wardrobe Pro - Debug Mode
echo ==========================================
echo           DIAGNOSTIC START
echo ==========================================

echo.
echo [STEP 1] Checking for Node.js...
node -v
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [CRITICAL ERROR] Node.js is NOT installed!
    echo You must install it from: https://nodejs.org/
    echo.
    pause
    exit
)
echo Node.js is found.

echo.
echo [STEP 2] Checking package.json...
if not exist "package.json" (
    echo.
    echo [CRITICAL ERROR] package.json is missing!
    pause
    exit
)
echo package.json exists.

echo.
echo [STEP 3] Installing dependencies (npm install)...
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] npm install failed! 
    echo There might be a syntax error in your package.json file.
    pause
    exit
)

echo.
echo [STEP 4] Starting the server...
call npm run start:local

echo.
echo ==========================================
echo Server stopped. Press any key to close.
pause