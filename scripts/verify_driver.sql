-- ============================================
-- VERIFICAR SE O MOTORISTA EXISTE
-- ============================================

SELECT
    id AS "Driver ID",
    name AS "Nome",
    email AS "Email",
    phone AS "Telefone",
    status AS "Status",
    "company_id" AS "Company ID",
    "created_at" AS "Criado em"
FROM drivers
WHERE id = '8d9d548a-6d91-4888-b437-95935ac0ea71';

-- Se não existir, você pode criar um motorista de teste:
-- Descomente as linhas abaixo para criar

/*
INSERT INTO drivers (
    id,
    "company_id",
    name,
    email,
    phone,
    status,
    "created_at",
    "updated_at"
) VALUES (
    '8d9d548a-6d91-4888-b437-95935ac0ea71',
    'SEU_COMPANY_ID',  -- ⚠️ SUBSTITUIR
    'Motorista de Teste',
    'motorista@teste.com',
    '+5511987654321',
    'ACTIVE',
    NOW(),
    NOW()
);
*/
