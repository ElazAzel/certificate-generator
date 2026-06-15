@echo off
chcp 65001 >nul
title Generator sertifikatov

:: Создание ярлыка на рабочем столе при первом запуске
if not exist "%USERPROFILE%\Desktop\Генератор Сертификатов.lnk" (
    echo [0/3] Sozdanie yarlyka na rabochem stole...
    set PSFILE=%TEMP%\mklnk_temp.ps1
    >"%PSFILE%" echo $WSH = New-Object -ComObject WScript.Shell
    >>"%PSFILE%" echo $L = $WSH.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Генератор Сертификатов.lnk')
    >>"%PSFILE%" echo $L.TargetPath = '%~f0'
    >>"%PSFILE%" echo $L.WorkingDirectory = '%~dp0'
    >>"%PSFILE%" echo $L.Description = 'Запуск генератора сертификатов'
    >>"%PSFILE%" echo $L.Save()
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PSFILE%" <nul
    del "%PSFILE%" 2>nul
    if exist "%USERPROFILE%\Desktop\Генератор Сертификатов.lnk" (
        echo   Yarlyk sozdan: Рабочий стол\Генератор Сертификатов.lnk
    )
)

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