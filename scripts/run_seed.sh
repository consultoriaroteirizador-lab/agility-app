#!/bin/bash

# ============================================
# Script para executar seed de dados de carteira
# ============================================

echo "=========================================="
echo " Seed de Dados - Carteira Digital"
echo "=========================================="
echo ""

# Configuracoes - AJUSTE CONFORME SUA NECESSIDADE
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-agility_db}
DB_USER=${DB_USER:-postgres}

echo ""
echo "1. Buscando Company ID..."
echo ""

# Buscar Company ID
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f scripts/find_company_id.sql

echo ""
echo ""
echo "2. ATENCAO: Copie o Company ID acima e atualize o arquivo seed_wallet_data.sql"
echo "   Substitua todas as ocorrencias de 'SEU_COMPANY_ID' pelo ID copiado."
echo ""
read -p "3. Pressione ENTER para continuar..."

echo ""
echo "3. Verificando se o motorista existe..."
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f scripts/verify_driver.sql

echo ""
echo "4. Executando seed de dados..."
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f scripts/seed_wallet_data.sql

echo ""
echo "=========================================="
echo " Seed concluido!"
echo "=========================================="
echo ""
echo "Agora voce pode testar a carteira no app com o motorista:"
echo "ID: 8d9d548a-6d91-4888-b437-95935ac0ea71"
echo ""
