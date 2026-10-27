@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if not errorlevel 1 (
    set "PYTHON=py -3"
) else (
    where python >nul 2>nul
    if not errorlevel 1 set "PYTHON=python"
)

if not defined PYTHON (
    echo Python was not found. Install Python 3 and make sure it is available on PATH.
    pause
    exit /b 1
)

start "Website server" cmd /k %PYTHON% -m http.server 8000 --bind 0.0.0.0
timeout /t 2 /nobreak >nul
echo.
echo Open this address on a phone connected to the same Wi-Fi:
powershell -NoProfile -Command "$ips = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } | ForEach-Object { $_.IPv4Address.IPAddress }; if ($ips) { $ips | ForEach-Object { Write-Output ('  http://' + $_ + ':8000') } } else { Write-Output '  Could not detect a network IPv4 address. Run ipconfig to find it.' }"
echo.
echo If Windows Firewall asks, allow Python on private networks.
echo If the phone cannot connect, confirm both devices are on the same Wi-Fi and allow inbound TCP port 8000 in Windows Firewall.
start "" "http://127.0.0.1:8000"
