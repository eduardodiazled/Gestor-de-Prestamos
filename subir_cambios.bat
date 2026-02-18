@echo off
setlocal
echo ==============================================
echo    ZALDO - GESTION DE BOLSILLOS (FINAL)
echo ==============================================
echo.
echo 1. Preparando archivos...
git add .
echo 2. Guardando cambios (Commit)...
git commit -m "CONTABILIDAD POR BOLSILLOS: Ganancia Liquida vs Reserva de Capital"
echo 3. Subiendo a la nube (GitHub/Vercel)...
git push
echo.
echo ==============================================
echo    PROCESO TERMINADO EXITOSAMENTE
echo ==============================================
echo.
echo He implementado la logica de los dos bolsillos:
echo - Ganancia Neta: Solo lo retirable (descontando reinversiones).
echo - Capital Disponible: La reserva para nuevos prestamos.
echo.
echo Espera 2 minutos y refresca tu web (Ctrl+F5).
pause
