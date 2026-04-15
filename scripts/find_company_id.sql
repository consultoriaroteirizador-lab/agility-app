-- ============================================
-- SCRIPT PARA ENCONTRAR O COMPANY ID
-- ============================================

-- Listar todas as empresas
SELECT
    id AS "Company ID",
    name AS "Nome da Empresa",
    cnpj AS "CNPJ",
    "is_active" AS "Ativa"
FROM companies
ORDER BY "created_at" DESC
LIMIT 10;

-- Ou listar com contagem de motoristas
SELECT
    c.id AS "Company ID",
    c.name AS "Nome da Empresa",
    COUNT(d.id) AS "Qtd Motoristas",
    c."is_active" AS "Ativa"
FROM companies c
LEFT JOIN drivers d ON d."company_id" = c.id
GROUP BY c.id, c.name, c."is_active"
ORDER BY "Qtd Motoristas" DESC;
