@echo off
setlocal
echo ==============================================
echo    ZALDO - SUBIDOR DE CAMBIOS (FIX FINAL)
echo ==============================================
echo.
echo 1. Preparando archivos...
git add .
echo 2. Guardando cambios (Commit)...
git commit -m "Sincronizacion robusta de saldos y ganancias (Interest/interest fix)"
echo 3. Subiendo a la nube (GitHub/Vercel)...
git push
echo.
echo ==============================================
echo    PROCESO TERMINADO EXITOSAMENTE
echo ==============================================
echo.
echo Los saldos y ganancias ya deberian aparecer correctamente.
echo Espera 2 minutos y refresca tu web (Ctrl+F5).
pause
