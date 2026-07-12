@echo off
echo =============================================
echo  Maszyna Voxel Prometeusza - Preview
echo =============================================
echo.
echo Budowanie wersji produkcyjnej...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo Blad podczas budowania!
    pause
    exit /b 1
)
echo.
echo Build zakonczony pomyslnie!
echo.
echo Uruchamiam serwer...
echo Otworz w przegladarce: http://localhost:3000
echo.
echo (Zamknij to okno aby zatrzymac)
echo.
node .next\standalone\server.js
pause
