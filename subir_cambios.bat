@echo off
setlocal
echo ==============================================
echo    ZALDO - RETORNO A VERSION SIMPLIFICADA
echo ==============================================
echo.
echo 1. Preparando archivos...
git add .
echo 2. Guardando cambios (Commit)...
git commit -m "REVERT UI: Menu original + Descuento de Reinversiones en Ganancia"
echo 3. Subiendo a la nube (GitHub/Vercel)...
git push
echo.
echo ==============================================
echo    PROCESO TERMINADO EXITOSAMENTE
echo ==============================================
echo.
echo He vuelto al diseno anterior pero manteniendo
echo la resta de reinversiones en la Ganancia Neta.
echo.
echo Espera 2 minutos y refresca tu web (Ctrl+F5).
pause
