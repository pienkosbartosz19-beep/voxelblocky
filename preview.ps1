# =============================================
# Maszyna Voxel Prometeusza - Preview Version
# =============================================
# Ten skrypt buduje produkcyjną wersję gry i uruchamia ją.
#
# Użycie:
#   1. Otwórz PowerShell w folderze projektu
#   2. ./preview.ps1
#
# Gra będzie dostępna pod adresem: http://localhost:3000
# =============================================

Write-Host "=== Budowanie wersji preview Maszyny Voxel Prometeusza ===" -ForegroundColor Cyan
Write-Host ""

# Buduj
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Błąd podczas budowania!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build zakończony pomyślnie!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Uruchamiam produkcyjną wersję gry..." -ForegroundColor Yellow
Write-Host "   Otwórz w przeglądarce: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "   (Naciśnij Ctrl+C aby zatrzymać serwer)" -ForegroundColor Gray
Write-Host ""

# Uruchom
node .next/standalone/server.js
