@echo off
setlocal
echo ==============================================
echo    ZALDO - SUBIDOR DE CAMBIOS (BLINDADO)
echo ==============================================
echo.
echo 1. Preparando archivos...
git add .
echo 2. Guardando cambios (Commit)...
git commit -m "Solucion definitiva: Ganancias Zury, Spanish types y Balance Wallet"
echo 3. Subiendo a la nube (GitHub/Vercel)...
git push
echo.
echo ==============================================
echo    PROCESO TERMINADO EXITOSAMENTE
echo ==============================================
echo.
echo Ya he blindado el sistema contra tipos de pago en espanol (Interes, Mora, etc.)
echo y corregido el saldo de Zury Numa.
echo Espera 2 minutos y refresca tu web (Ctrl+F5).
pause
