@echo off
setlocal
echo ==============================================
echo    ZALDO - SUBIDOR DE CAMBIOS AUTOMATICO
echo ==============================================
echo.
echo 1. Preparando archivos...
git add .
echo 2. Guardando cambios (Commit)...
git commit -m "Correccion de balance negativo y recibos finales"
echo 3. Subiendo a la nube (GitHub/Vercel)...
git push
echo.
echo ==============================================
echo    PROCESO TERMINADO EXITOSAMENTE
echo ==============================================
echo.
echo Ya puedes cerrar esta ventana y revisar tu web en 2 minutos.
pause
