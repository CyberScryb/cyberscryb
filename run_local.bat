@echo off
echo ==========================================
echo   CyberScryb Local Development Server
echo ==========================================

echo [1/2] Syncing and compiling site...
python sync_and_build.py

echo.
echo [2/2] Starting Firebase Emulator...
echo Opening browser...
start "" "http://localhost:5000"
call npx firebase emulators:start --only hosting
pause
