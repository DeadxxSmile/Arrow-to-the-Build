@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Arrow to the Build - Build Windows Installer

 echo ============================================================
 echo   Arrow to the Build - Build Windows Installer
 echo ============================================================
 echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo Install the current Node.js LTS release, then run this file again.
  goto :failed
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm was not found in PATH.
  echo Reinstall Node.js with npm included, then run this file again.
  goto :failed
)

for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version"`) do set "ATTB_VERSION=%%V"
if not defined ATTB_VERSION (
  echo [ERROR] Could not read the ATTB version from package.json.
  goto :failed
)

echo [1/3] Installing locked dependencies...
call npm ci --include=dev --no-audit --no-fund
if errorlevel 1 goto :failed

echo.
echo [2/3] Running tests...
call npm test
if errorlevel 1 goto :failed

echo.
echo [3/3] Building the Windows installer...
if exist dist rmdir /s /q dist
call npm run build
if errorlevel 1 goto :failed

set "INSTALLER=dist\ATTB-Setup-%ATTB_VERSION%.exe"
if not exist "%INSTALLER%" (
  echo [ERROR] The build finished without creating %INSTALLER%.
  goto :failed
)

echo.
echo ============================================================
echo   BUILD COMPLETE
echo ============================================================
echo Installer:
echo   %CD%\%INSTALLER%
echo.
echo The installer was created but was not launched.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo   BUILD FAILED
echo ============================================================
echo Review the output above for the exact error.
pause
exit /b 1
