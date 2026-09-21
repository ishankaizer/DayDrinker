@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo DayDrinker needs Node.js installed to run ^(it's an Electron app^).
    echo Grab it from https://nodejs.org and re-run this file.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies, this only happens once...
    call npm install
    if errorlevel 1 (
        echo npm install failed. Scroll up for the error.
        pause
        exit /b 1
    )
)

echo Starting DayDrinker...
call npm start

if errorlevel 1 (
    echo DayDrinker exited with an error. Scroll up for details.
    pause
)
