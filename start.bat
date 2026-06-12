@echo off
chcp 65001 >nul
title Generator sertifikatov

echo ============================================
echo   Generator sertifikatov - zapusk
echo ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [OSHI BKA] Node.js ne nayden. Ustanovite s https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Ustanovka zavisimostey...

if not exist "node_modules" (
    call npm install --silent
)

if not exist "server\node_modules" (
    pushd server
    call npm install --silent
    popd
)

if not exist "client\node_modules" (
    pushd client
    call npm install --silent
    popd
)

echo [2/3] Sborka klienta...

pushd client
call npx.cmd vite build --logLevel silent
popd

echo [3/3] Zapusk servera...
echo.
echo Otkroyte v brauzere: http://localhost:3001
echo.

start "" http://localhost:3001

pushd server
call npx.cmd tsx src/index.ts

pause