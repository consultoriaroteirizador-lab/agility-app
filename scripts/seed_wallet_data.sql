-- ============================================
-- SEED DE DADOS PARA TESTAR CARTEIRA
-- Motorista ID: 8d9d548a-6d91-4888-b437-95935ac0ea71
-- ============================================

-- Primeiro, verifica se a carteira já existe e remove
DO $$
BEGIN
    DELETE FROM "driver_advance_returns" WHERE "advance_id" IN (
        SELECT id FROM "driver_advances" WHERE "driver_id" = '8d9d548a-6d91-4888-b437-95935ac0ea71'
    );

    DELETE FROM "driver_advances" WHERE "driver_id" = '8d9d548a-6d91-4888-b437-95935ac0ea71';

    DELETE FROM "withdrawal_requests" WHERE "wallet_id" IN (
        SELECT id FROM "driver_wallets" WHERE "driver_id" = '8d9d548a-6d91-4888-b437-95935ac0ea71'
    );

    DELETE FROM "driver_wallet_transactions" WHERE "wallet_id" IN (
        SELECT id FROM "driver_wallets" WHERE "driver_id" = '8d9d548a-6d91-4888-b437-95935ac0ea71'
    );

    DELETE FROM "driver_wallets" WHERE "driver_id" = '8d9d548a-6d91-4888-b437-95935ac0ea71';
END $$;

-- ============================================
-- 1. CRIAR CARTEIRA DO MOTORISTA
-- ============================================
-- Nota: Substitua 'SEU_COMPANY_ID' pelo ID real da empresa
INSERT INTO "driver_wallets" (
    id,
    "company_id",
    "driver_id",
    "balance",
    "blocked_balance",
    "bank_name",
    "bank_agency",
    "bank_account",
    "pix_key",
    "pix_key_type",
    "is_active",
    "created_at",
    "updated_at"
) VALUES (
    'wallet-test-001',  -- ID da carteira
    'SEU_COMPANY_ID',   -- ⚠️ SUBSTITUIR PELO ID REAL DA EMPRESA
    '8d9d548a-6d91-4888-b437-95935ac0ea71',
    125000,  -- R$ 1.250,00 (saldo total em centavos)
    5000,    -- R$ 50,00 (bloqueado em centavos)
    'Nubank',
    '0001',
    '12345678-9',
    '11987654321',
    'PHONE',
    true,
    NOW(),
    NOW()
);

-- ============================================
-- 2. CRIAR TRANSAÇÕES DE UBERIZAÇÃO (Ganhos próprios)
-- ============================================
-- Saldo disponível aumenta com UBERIZATION
INSERT INTO "driver_wallet_transactions" (
    id,
    "company_id",
    "wallet_id",
    type,
    status,
    amount,
    "balance_after",
    description,
    "created_at"
) VALUES
(
    'trans-uber-001',
    'SEU_COMPANY_ID',
    'wallet-test-001',
    'CREDIT',  -- UBERIZATION será usado quando o backend for atualizado
    'COMPLETED',
    85000,  -- R$ 850,00
    85000,
    'Ganhos de uberização - 15 viagens completadas',
    NOW() - INTERVAL '5 days'
),
(
    'trans-uber-002',
    'SEU_COMPANY_ID',
    'wallet-test-001',
    'CREDIT',
    'COMPLETED',
    120000,  -- R$ 1.200,00
    205000,
    'Ganhos de uberização - 22 viagens completadas',
    NOW() - INTERVAL '3 days'
),
(
    'trans-uber-003',
    'SEU_COMPANY_ID',
    'wallet-test-001',
    'CREDIT',
    'COMPLETED',
    95000,  -- R$ 950,00
    300000,
    'Ganhos de uberização - 18 viagens completadas',
    NOW() - INTERVAL '1 day'
);

-- ============================================
-- 3. CRIAR TRANSAÇÕES DE ADIANTAMENTO (Recebido da empresa)
-- ============================================
-- Adiantamento aumenta saldo, mas aumenta blocked_balance
INSERT INTO "driver_wallet_transactions" (
    id,
    "company_id",
    "wallet_id",
    type,
    status,
    amount,
    "balance_after",
    description,
    "created_at"
) VALUES
(
    'trans-adv-001',
    'SEU_COMPANY_ID',
    'wallet-test-001',
    'ADVANCE',
    'COMPLETED',
    150000,  -- R$ 1.500,00 (adiantamento recebido)
    450000,
    'Adiantamento para rota #12345',
    NOW() - INTERVAL '4 days'
);

-- ============================================
-- 4. CRIAR TRANSAÇÕES DE DEVOLUÇÃO (Pagar empresa)
-- ============================================
-- Devolução diminui balance E blocked_balance
INSERT INTO "driver_wallet_transactions" (
    id,
    "company_id",
    "wallet_id",
    type,
    status,
    amount,
    "balance_after",
    description,
    "created_at"
) VALUES
(
    'trans-ret-001',
    'SEU_COMPANY_ID',
    'wallet-test-001',
    'ADVANCE_RETURN',
    'COMPLETED',
    -50000,  -- R$ 500,00 devolvidos (débito)
    400000,
    'Devolução parcial de adiantamento',
    NOW() - INTERVAL '2 days'
),
(
    'trans-ret-002',
    'SEU_COMPANY_ID',
    'wallet-test-001',
    'ADVANCE_RETURN',
    'COMPLETED',
    -75000,  -- R$ 750,00 devolvidos (débito)
    325000,
    'Devolução de adiantamento - PIX',
    NOW() - INTERVAL '1 day'
);

-- ============================================
-- 5. CRIAR SOLICITAÇÕES DE SAQUE
-- ============================================
INSERT INTO "withdrawal_requests" (
    id,
    "company_id",
    "wallet_id",
    amount,
    fee,
    "net_amount",
    method,
    "bank_name",
    "bank_agency",
    "bank_account",
    "pix_key",
    "pix_key_type",
    status,
    "created_at"
) VALUES
(
    'withdraw-001',
    'SEU_COMPANY_ID',
    'wallet-test-001',
    100000,  -- R$ 1.000,00
    0,       -- Sem taxa
    100000,
    'PIX',
    'Nubank',
    '0001',
    '12345678-9',
    '11987654321',
    'PHONE',
    'COMPLETED',
    NOW() - INTERVAL '3 days'
),
(
    'withdraw-002',
    'SEU_COMPANY_ID',
    'wallet-test-001',
    50000,   -- R$ 500,00
    0,
    50000,
    'PIX',
    'Nubank',
    '0001',
    '12345678-9',
    '11987654321',
    'PHONE',
    'PENDING',  -- Ainda em processamento (bloqueia saldo)
    NOW() - INTERVAL '2 hours'
);

-- ============================================
-- 6. CRIAR ADIANTAMENTOS PENDENTES
-- ============================================
INSERT INTO "driver_advances" (
    id,
    "company_id",
    "driver_id",
    "routing_id",
    amount,
    "returned_amount",
    status,
    description,
    "due_date",
    "is_overdue",
    "created_at"
) VALUES
(
    'advance-001',
    'SEU_COMPANY_ID',
    '8d9d548a-6d91-4888-b437-95935ac0ea71',
    'route-test-001',
    200000,  -- R$ 2.000,00
    0,       -- Nada devolvido ainda
    'PENDING',
    'Adiantamento para rota São Paulo - Campinas',
    NOW() + INTERVAL '3 days',  -- Vence em 3 dias
    false,
    NOW() - INTERVAL '1 day'
),
(
    'advance-002',
    'SEU_COMPANY_ID',
    '8d9d548a-6d91-4888-b437-95935ac0ea71',
    'route-test-002',
    150000,  -- R$ 1.500,00
    50000,   -- Já devolveu R$ 500,00
    'PARTIAL',
    'Adiantamento para rota Rio de Janeiro',
    NOW() - INTERVAL '1 day',  -- Venceu ontem!
    true,   -- VENCIDO
    NOW() - INTERVAL '5 days'
),
(
    'advance-003',
    'SEU_COMPANY_ID',
    '8d9d548a-6d91-4888-b437-95935ac0ea71',
    NULL,
    100000,  -- R$ 1.000,00
    0,
    'PENDING',
    'Adiantamento para despesas com combustível',
    NOW() + INTERVAL '7 days',
    false,
    NOW()
);

-- ============================================
-- 7. REGISTRAR DEVOLUÇÕES PARCIAIS
-- ============================================
INSERT INTO "driver_advance_returns" (
    id,
    "company_id",
    "advance_id",
    amount,
    method,
    "payment_method",
    notes,
    "created_at"
) VALUES
(
    'return-001',
    'SEU_COMPANY_ID',
    'advance-002',
    50000,  -- R$ 500,00
    'CASH',
    'MONEY',
    'Entregue em dinheiro ao fiscal',
    NOW() - INTERVAL '2 days'
);

-- ============================================
-- RESUMO DOS DADOS CRIADOS
-- ============================================
/*
CARTEIRA:
- Saldo Total: R$ 325.000 (R$ 3.250,00)
- Saldo Bloqueado: R$ 50.000 (R$ 500,00) - saque pendente
- Saldo Disponível: R$ 275.000 (R$ 2.750,00)

TRANSAÇÕES:
- 3 transações de UBERIZATION (ganhos)
- 1 transação de ADVANCE (adiantamento recebido)
- 2 transações de ADVANCE_RETURN (devoluções)

SAQUES:
- 1 saque COMPLETED (R$ 1.000,00)
- 1 saque PENDING (R$ 500,00) - bloqueia saldo

ADIANTAMENTOS:
- 1 PENDENTE (R$ 2.000,00) - vence em 3 dias
- 1 PARTIAL (R$ 1.500,00) - R$ 500 devolvido, VENCIDO!
- 1 PENDENTE (R$ 1.000,00) - vence em 7 dias
- Total pendente: R$ 4.000,00
*/

SELECT 'Seed concluído com sucesso!' AS status;
SELECT 'CARTEIRA' AS tipo, id, "driver_id", "balance", "blocked_balance" FROM "driver_wallets" WHERE "driver_id" = '8d9d548a-6d91-4888-b437-95935ac0ea71'
UNION ALL
SELECT 'TRANSAÇÕES', id, "wallet_id", amount, "balance_after" FROM "driver_wallet_transactions" WHERE "wallet_id" = 'wallet-test-001'
UNION ALL
SELECT 'SAQUES', id, "wallet_id", amount, "net_amount" FROM "withdrawal_requests" WHERE "wallet_id" = 'wallet-test-001'
UNION ALL
SELECT 'ADIANTAMENTOS', id, "driver_id", amount, "returned_amount" FROM "driver_advances" WHERE "driver_id" = '8d9d548a-6d91-4888-b437-95935ac0ea71';
