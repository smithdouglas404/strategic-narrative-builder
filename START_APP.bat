@echo off
setlocal
cd /d "%~dp0"

if not defined PORT set "PORT=8787"
if not defined IT_BENCHMARKING_URL set "IT_BENCHMARKING_URL=http://127.0.0.1:8793"
if not defined AI_VALUE_NAVIGATOR_URL set "AI_VALUE_NAVIGATOR_URL=http://127.0.0.1:8794"

rem Start the shared benchmarking case API when the sibling tool is available.
powershell.exe -NoProfile -WindowStyle Hidden -Command "$health='%IT_BENCHMARKING_URL%/api/health'; try { Invoke-RestMethod -Uri $health -TimeoutSec 2 | Out-Null } catch { $dir=[IO.Path]::GetFullPath((Join-Path '%~dp0' '..\it-spend-benchmarking-tool')); if ($health -like 'http://127.0.0.1:8793/*' -and (Test-Path (Join-Path $dir 'server.py'))) { if (Get-Command py -ErrorAction SilentlyContinue) { Start-Process -FilePath 'py' -ArgumentList '-3','server.py' -WorkingDirectory $dir -WindowStyle Hidden } elseif (Get-Command python -ErrorAction SilentlyContinue) { Start-Process -FilePath 'python' -ArgumentList 'server.py' -WorkingDirectory $dir -WindowStyle Hidden } } }"

rem Start the shared AI Value Navigator case API when the sibling tool is available.
powershell.exe -NoProfile -WindowStyle Hidden -Command "$health='%AI_VALUE_NAVIGATOR_URL%/api/health'; try { Invoke-RestMethod -Uri $health -TimeoutSec 2 | Out-Null } catch { $dir=[IO.Path]::GetFullPath((Join-Path '%~dp0' '..\ai-value-navigator')); if ($health -like 'http://127.0.0.1:8794/*' -and (Test-Path (Join-Path $dir 'server.py'))) { if (Get-Command py -ErrorAction SilentlyContinue) { Start-Process -FilePath 'py' -ArgumentList '-3','server.py' -WorkingDirectory $dir -WindowStyle Hidden } elseif (Get-Command python -ErrorAction SilentlyContinue) { Start-Process -FilePath 'python' -ArgumentList 'server.py' -WorkingDirectory $dir -WindowStyle Hidden } } }"

where py >nul 2>&1
if not errorlevel 1 (
  start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:%PORT%/'"
  py -3 server.py
  goto :done
)

where python >nul 2>&1
if not errorlevel 1 (
  start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:%PORT%/'"
  python server.py
  goto :done
)

echo Python 3 was not found.
echo Install Python from https://www.python.org/downloads/ and run this file again.
pause
exit /b 1

:done
if errorlevel 1 (
  echo.
  echo The application stopped with an error.
  pause
)
