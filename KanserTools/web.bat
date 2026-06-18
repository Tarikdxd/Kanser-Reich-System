@echo off
title KANSER TOOLS — Web Dashboard
cd /d "%~dp0"
echo.
echo   ==========================================
echo     KANSER TOOLS — Web Dashboard
echo   ==========================================
echo.
echo   Starting web server on port 9000...
echo   Open: http://localhost:9000
echo.
echo   Keep this window open. Press Ctrl+C to stop.
echo   ==========================================
echo.
python -c "from web_dashboard import start_web; start_web()"
pause
