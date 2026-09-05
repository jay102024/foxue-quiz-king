@echo off
chcp 65001 >nul
title 佛學知識王
cd /d "%~dp0"

rem === 選擇 Node：優先用資料夾內附的可攜式 node.exe，免安裝 ===
set "NODE_EXE="
if exist "%~dp0runtime\node.exe" set "NODE_EXE=%~dp0runtime\node.exe"
if not defined NODE_EXE (
  where node >nul 2>nul && set "NODE_EXE=node"
)
if not defined NODE_EXE (
  echo.
  echo   [錯誤] 找不到 Node 執行環境。
  echo   正常情況下本資料夾內含 runtime\node.exe，
  echo   若被防毒 / 解壓縮軟體移除，請重新完整解壓縮整個資料夾，
  echo   或到 https://nodejs.org 安裝 Node 後再雙擊本檔。
  echo.
  pause
  exit /b 1
)

echo ============================================
echo    佛學知識王  啟動中...
echo    稍候會自動打開瀏覽器。
echo    請「勿關閉」此黑色視窗（關閉即停止遊戲）。
echo ============================================
echo.

rem 背景等待約 3 秒讓伺服器就緒，再用預設瀏覽器打開遊戲
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

rem 啟動伺服器（此行會持續執行直到關閉視窗）
"%NODE_EXE%" --no-warnings server.js

echo.
echo 伺服器已停止。按任意鍵關閉視窗...
pause >nul
