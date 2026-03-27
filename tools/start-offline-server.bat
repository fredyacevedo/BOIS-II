@echo off
setlocal
cd /d "%~dp0\..\.."
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js no esta instalado o no esta en PATH.
  echo Instala Node.js para usar el servidor offline local.
  pause
  exit /b 1
)
echo Iniciando servidor offline en APP_PLAYGROUND...
start "BOIS_OFFLINE_SERVER" cmd /k "node "REPOSITORIES CODE TO USE\three.js-dev\utils\server.js" -p 8080"
timeout /t 2 >nul
start "" "http://127.0.0.1:8080/BOIS%%20GUI/main-menu.html"
echo Servidor lanzado. URL: http://127.0.0.1:8080/BOIS%%20GUI/main-menu.html
endlocal
