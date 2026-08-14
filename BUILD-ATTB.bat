@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title ATTB - Windows Installer Build

rem -----------------------------------------------------------------------------
rem Arrow to the Build - reproducible Windows installer build
rem Run this file from the repository root. It restores the locked dependencies,
rem refreshes optional skill icons, runs the full test suite, and packages NSIS.
rem -----------------------------------------------------------------------------

if not exist "package.json" (
  echo [ERROR] package.json was not found next to BUILD-ATTB.bat.
  echo Run the build script from a complete ATTB source checkout.
  goto :failed
)

if not exist "package-lock.json" (
  echo [ERROR] package-lock.json was not found.
  echo The installer build requires the lockfile for a reproducible npm ci install.
  goto :failed
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo Install the current Node.js LTS release, then run BUILD-ATTB.bat again.
  goto :failed
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm was not found in PATH.
  echo Reinstall Node.js with npm included, then run BUILD-ATTB.bat again.
  goto :failed
)

for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version" 2^>nul`) do set "ATTB_VERSION=%%V"
if not defined ATTB_VERSION (
  echo [ERROR] Could not read the ATTB version from package.json.
  goto :failed
)

for /f "delims=" %%V in ('node --version') do set "NODE_VERSION=%%V"
for /f "delims=" %%V in ('npm --version') do set "NPM_VERSION=%%V"

title ATTB v%ATTB_VERSION% - Windows Installer Build

echo ============================================================
echo   ATTB v%ATTB_VERSION% - Windows Installer Build
echo ============================================================
echo   Source: %CD%
echo   Node:   %NODE_VERSION%
echo   npm:    %NPM_VERSION%
echo ============================================================
echo.

echo [1/5] Restoring locked dependencies...
call npm ci --include=dev --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo [ERROR] Dependency installation failed.
  goto :failed
)

echo.
echo [2/5] Refreshing optional ESO skill icons...
call npm run fetch:icons
if errorlevel 1 (
  echo.
  echo [WARNING] Skill icon refresh failed.
  echo           The build will continue using available cached icons and letter fallbacks.
)

echo.
echo [3/5] Running the full test suite...
call npm test
if errorlevel 1 (
  echo.
  echo [ERROR] Tests failed. Packaging has been stopped.
  goto :failed
)

echo.
echo [4/5] Cleaning previous package output...
if exist "dist" (
  rmdir /s /q "dist"
  if exist "dist" (
    echo [ERROR] Could not remove the existing dist folder.
    echo Close anything using files in dist, then run BUILD-ATTB.bat again.
    goto :failed
  )
)

echo.
echo [5/5] Building the renderer and Windows installer...
call npm run build
if errorlevel 1 (
  echo.
  echo [ERROR] The application package build failed.
  goto :failed
)

set "INSTALLER=dist\ATTB-Setup-%ATTB_VERSION%.exe"
if not exist "%INSTALLER%" (
  echo.
  echo [ERROR] Packaging completed without the expected installer:
  echo         %INSTALLER%
  goto :failed
)

echo.
echo ============================================================
echo   BUILD COMPLETE - ATTB v%ATTB_VERSION%
echo ============================================================
echo.
echo Windows installer ready:
echo   %CD%\%INSTALLER%
echo.
echo All build steps completed successfully.
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo   BUILD FAILED
echo ============================================================
echo.
echo No new installer has been verified.
echo Review the first error above and the command output immediately before it.
echo.
pause
exit /b 1
