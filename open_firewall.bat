@echo off
echo ========================================
echo MedTrack Backend - Firewall Setup
echo ========================================
echo.
echo This script will open port 5000 for the backend server.
echo You need to run this as Administrator.
echo.
pause

echo Adding firewall rule...
netsh advfirewall firewall add rule name="MedTrack Backend Port 5000" dir=in action=allow protocol=TCP localport=5000

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! Port 5000 is now open.
    echo ========================================
    echo.
    echo You can now use the MedTrack app.
    echo The backend server can receive connections from your phone.
) else (
    echo.
    echo ========================================
    echo FAILED! Please run this file as Administrator.
    echo ========================================
    echo.
    echo Right-click this file and select "Run as administrator"
)

echo.
pause
