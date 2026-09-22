@echo off
setlocal enabledelayedexpansion

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

rem First run only: drop a "DayDrinker" shortcut on the Desktop pointing
rem back at this file, so you never have to open this folder again.
if not exist "%USERPROFILE%\Desktop\DayDrinker.lnk" (
    echo Creating a Desktop shortcut for next time...
    set "SHORTCUT_VBS=%TEMP%\daydrinker_shortcut.vbs"
    > "!SHORTCUT_VBS!" echo Set oWS = WScript.CreateObject("WScript.Shell")
    >> "!SHORTCUT_VBS!" echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\DayDrinker.lnk"
    >> "!SHORTCUT_VBS!" echo Set oLink = oWS.CreateShortcut(sLinkFile)
    >> "!SHORTCUT_VBS!" echo oLink.TargetPath = "%~f0"
    >> "!SHORTCUT_VBS!" echo oLink.WorkingDirectory = "%~dp0"
    >> "!SHORTCUT_VBS!" echo oLink.Description = "Your DayDrinker desktop pet"
    >> "!SHORTCUT_VBS!" echo oLink.Save
    cscript //nologo "!SHORTCUT_VBS!" >nul
    del "!SHORTCUT_VBS!" >nul 2>nul
    echo Done — look for "DayDrinker" on your Desktop next time.
)

echo Starting DayDrinker...
call npm start

if errorlevel 1 (
    echo DayDrinker exited with an error. Scroll up for details.
    pause
)
