@echo off
REM ============================================
REM Script para executar seed de dados de carteira
REM ============================================

echo ==========================================
echo  Seed de Dados - Carteira Digital
echo ==========================================
echo.

REM Configuracoes - AJUSTE CONFORME SUA NECESSIDADED
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=agility_db
set DB_USER=postgres
set COMPANY_ID=SEU_COMPANY_ID

echo.
echo 1. Primeiro, vou buscar o Company ID...
echo.

REM Buscar Company ID
psql -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -U %DB_USER% -f scripts/find_company_id.sql

echo.
echo.
echo 2. ATENCAO: Copie o Company ID acima e atualize o arquivo seed_wallet_data.sql
echo    Substitua todas as ocorrencias de 'SEU_COMPANY_ID' pelo ID copiado.
echo.
echo 3. Depois pressione qualquer tecla para continuar...
pause > nul

echo.
echo 3. Verificando se o motorista existe...
echo.

psql -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -U %DB_USER% -f scripts/verify_driver.sql

echo.
echo 4. Executando seed de dados...
echo.

psql -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -U %DB_USER% -f scripts/seed_wallet_data.sql

echo.
echo ==========================================
echo  Seed concluido!
echo ==========================================
echo.
echo  Agora voce pode testar a carteira no app com o motorista:
echo  ID: 8d9d548a-6d91-4888-b437-95935ac0ea71
echo.
pause
