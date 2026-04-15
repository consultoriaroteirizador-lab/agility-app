-- ============================================
-- SEED SIMPLIFICADO - TESTE RÁPIDO
-- Motorista: 8d9d548a-6d91-4888-b437-95935ac0ea71
-- ============================================

-- ⚠️ SUBSTITUIR 'SEU_COMPANY_ID' PELO ID REAL DA EMPRESA

-- 1. Criar carteira simples
INSERT INTO "driver_wallets" (
    id, "company_id", "driver_id",
    "balance", "blocked_balance",
    "pix_key", "pix_key_type",
    "is_active", "created_at", "updated_at"
) VALUES (
    'wallet-simple-001',
    'SEU_COMPANY_ID',  -- ⚠️ SUBSTITUIR
    '8d9d548a-6d91-4888-b437-95935ac0ea71',
    50000,  -- R$ 500,00
    0,
    '11987654321',
    'PHONE',
    true,
    NOW(),
    NOW()
)
ON CONFLICT ("driver_id") DO UPDATE SET
    "balance" = 50000,
    "updated_at" = NOW();

-- 2. Criar algumas transações
INSERT INTO "driver_wallet_transactions" (
    id, "company_id", "wallet_id",
    type, status, amount, "balance_after",
    description, "created_at"
) VALUES
    ('trans-simple-001', 'SEU_COMPANY_ID', 'wallet-simple-001',
     'CREDIT', 'COMPLETED', 30000, 30000,
     'Viagem 1', NOW() - INTERVAL '2 days'),
    ('trans-simple-002', 'SEU_COMPANY_ID', 'wallet-simple-001',
     'CREDIT', 'COMPLETED', 20000, 50000,
     'Viagem 2', NOW() - INTERVAL '1 day');

-- 3. Criar um adiantamento pendente
INSERT INTO "driver_advances" (
    id, "company_id", "driver_id",
    amount, "returned_amount", status,
    description, "due_date", "is_overdue", "created_at"
) VALUES (
    'advance-simple-001',
    'SEU_COMPANY_ID',
    '8d9d548a-6d91-4888-b437-95935ac0ea71',
    100000,  -- R$ 1.000,00
    0,
    'PENDING',
    'Adiantamento de teste',
    NOW() + INTERVAL '5 days',
    false,
    NOW()
);

SELECT 'Seed simplificado concluído!' AS status;
SELECT 'CARTEIRA' AS tipo, id, "driver_id", "balance", "pix_key" FROM "driver_wallets" WHERE "driver_id" = '8d9d548a-6d91-4888-b437-95935ac0ea71';
