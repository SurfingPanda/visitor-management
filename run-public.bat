@echo off
REM ============================================================
REM  ECSecora - expose the app over a free Cloudflare Tunnel
REM  (https URL for tablet/phone install + camera access).
REM
REM  Before running: stop the "npm run dev" window if it's open.
REM  If you changed code since the last build, run: npm run build
REM ============================================================

cd /d C:\xampp\htdocs\visitor

REM Force production (build) asset mode so a remote device can load assets.
if exist public\hot del public\hot

REM 1) App server (built assets) on a local port.
start "ECSecora App" cmd /k "php artisan serve --host 127.0.0.1 --port 8000"

REM Give the app a moment to boot.
timeout /t 3 >nul

REM 2) Cloudflare Tunnel -> the app. The URL prints in this new window.
start "ECSecora Tunnel" cmd /k "C:\xampp\cloudflared\cloudflared.exe tunnel --url http://127.0.0.1:8000"

echo.
echo Two windows opened:
echo   - "ECSecora App"    : the Laravel server (leave it running)
echo   - "ECSecora Tunnel" : shows your https://<random>.trycloudflare.com URL
echo.
echo Open that https URL on your tablet/phone to install the app.
echo Close both windows to take the app offline.
echo.
pause
