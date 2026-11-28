@echo off
rem Move Review launcher (#141, dev tool): double-click to start the helper server and open the page in your browser.
rem Close this window (or press Ctrl+C in it) to stop the server.
cd /d "%~dp0.."
title Move Review server
start "" cmd /c "ping -n 3 127.0.0.1 >nul && start http://127.0.0.1:8790/tools/move-review.html"
node tools\move-review-server.js
echo.
echo The server stopped. If it said the port is in use, another Move Review window is already running.
pause
