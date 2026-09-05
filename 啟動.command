#!/bin/bash
# 佛學知識王 —— macOS 啟動器(對應 Windows 的 啟動.bat)
# 第一次使用請先在「終端機」執行一次:  chmod +x 啟動.command

cd "$(dirname "$0")" || exit 1

# === 選擇 Node:優先用資料夾內附的可攜式 node,免安裝 ===
NODE_EXE=""
[ -x "./runtime/node-mac" ] && NODE_EXE="./runtime/node-mac"

if [ -z "$NODE_EXE" ]; then
  # 雙擊啟動時 PATH 可能不完整,常見安裝位置一併找過
  for p in "$(command -v node 2>/dev/null)" \
           /opt/homebrew/bin/node \
           /usr/local/bin/node \
           "$HOME/.nvm/versions/node"/*/bin/node ; do
    if [ -x "$p" ]; then NODE_EXE="$p"; break; fi
  done
fi

if [ -z "$NODE_EXE" ]; then
  echo
  echo "  [錯誤] 找不到 Node 執行環境。"
  echo "  本遊戲需要 Node 22.5 以上(內建 SQLite 功能)。"
  echo "  請到 https://nodejs.org 下載 macOS 版安裝後,再雙擊本檔。"
  echo
  read -n 1 -s -r -p "按任意鍵關閉視窗..."
  exit 1
fi

# === 檢查版本:node:sqlite 需要 Node 22.5 以上 ===
V="$("$NODE_EXE" -v 2>/dev/null)"; V="${V#v}"
MAJOR="${V%%.*}"; REST="${V#*.}"; MINOR="${REST%%.*}"
if [ "${MAJOR:-0}" -lt 22 ] 2>/dev/null || { [ "${MAJOR:-0}" -eq 22 ] && [ "${MINOR:-0}" -lt 5 ]; }; then
  echo
  echo "  [錯誤] Node 版本過舊(目前 v$V),本遊戲需要 22.5 以上。"
  echo "  請到 https://nodejs.org 下載最新的 LTS 版本更新。"
  echo
  read -n 1 -s -r -p "按任意鍵關閉視窗..."
  exit 1
fi

echo "============================================"
echo "   佛學知識王  啟動中...  (Node v$V)"
echo "   稍候會自動打開瀏覽器。"
echo "   請「勿關閉」此終端機視窗（關閉即停止遊戲）。"
echo "============================================"
echo

# 背景等約 3 秒讓伺服器就緒,再用預設瀏覽器打開遊戲
( sleep 3; open "http://localhost:3000" ) &

# 啟動伺服器(此行會持續執行直到關閉視窗或按 Ctrl+C)
"$NODE_EXE" --no-warnings server.js

echo
read -n 1 -s -r -p "伺服器已停止。按任意鍵關閉視窗..."
