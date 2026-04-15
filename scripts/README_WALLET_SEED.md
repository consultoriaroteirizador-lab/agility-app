# Scripts de Seed para Carteira Digital

## 📁 Arquivos

- `seed_wallet_data.sql` - Script completo para criar dados de teste
- `find_company_id.sql` - Script para encontrar o ID da empresa

## 🚀 Como Usar

### 1. Encontrar o Company ID

Antes de executar o seed, você precisa saber o ID da empresa:

```bash
psql -U seu_usuario -d seu_banco -f scripts/find_company_id.sql
```

Copie o `Company ID` da empresa desejada.

### 2. Atualizar o Seed

Abra `seed_wallet_data.sql` e substitua **TODAS** as ocorrências de:

```sql
'SEU_COMPANY_ID'
```

Pelo ID da empresa que você copiou (ex: `'123e4567-e89b-12d3-a456-426614174000'`)

### 3. Executar o Seed

```bash
psql -U seu_usuario -d seu_banco -f scripts/seed_wallet_data.sql
```

Ou via Docker:

```bash
docker exec -it nome_do_container psql -U usuario -d database -f /scripts/seed_wallet_data.sql
```

## 📊 Dados Criados

### Motorista de Teste
- **ID:** `8d9d548a-6d91-4888-b437-95935ac0ea71`

### Carteira
```
Saldo Total:     R$ 3.250,00
Saldo Bloqueado: R$ 500,00 (saque pendente)
Saldo Disponível: R$ 2.750,00
```

### Dados Bancários
- **Banco:** Nubank
- **Agência:** 0001
- **Conta:** 12345678-9
- **PIX:** 11987654321 (TELEFONE)

### Transações (6)
| Tipo         | Valor       | Descrição                          |
|--------------|-------------|------------------------------------|
| CREDIT       | R$ 850,00   | 15 viagens completadas            |
| CREDIT       | R$ 1.200,00 | 22 viagens completadas            |
| CREDIT       | R$ 950,00   | 18 viagens completadas            |
| ADVANCE      | R$ 1.500,00 | Adiantamento para rota #12345     |
| ADV_RETURN   | -R$ 500,00  | Devolução parcial                 |
| ADV_RETURN   | -R$ 750,00  | Devolução via PIX                 |

### Saques (2)
| Status    | Valor       | Data                |
|-----------|-------------|---------------------|
| COMPLETED | R$ 1.000,00 | 3 dias atrás        |
| PENDING   | R$ 500,00   | 2 horas atrás       |

### Adiantamentos (3)
| Status   | Valor        | Devolvido | Pendente | Vence em    |
|----------|--------------|-----------|----------|-------------|
| PENDING  | R$ 2.000,00  | R$ 0,00   | R$ 2.000| 3 dias      |
| PARTIAL  | R$ 1.500,00  | R$ 500,00 | R$ 1.000| VENCIDO!    |
| PENDING  | R$ 1.000,00  | R$ 0,00   | R$ 1.000| 7 dias      |

**Total de adiantamentos pendentes:** R$ 4.000,00

## 🔍 Verificar Dados no App

Depois de executar o seed, no app você verá:

### Tela de Carteira
- ✅ Saldo disponível: R$ 2.750,00
- ⚠️ Saldo bloqueado: R$ 500,00
- 🏦 Dados bancários configurados
- ⚠️ **ALERTA:** Adiantamentos vencidos!

### Tela de Extrato
- 6 transações listadas
- Verdes (créditos): 4
- Vermelhas (débitos): 2

### Tela de Adiantamentos
- 3 adiantamentos ativos
- 1 vencido (em vermelho)
- Total pendente: R$ 4.000,00

### Tela de Saque
- Pode sacar até R$ 2.750,00
- Dados PIX já configurados

## 🧹 Limpar Dados de Teste

```sql
-- Remover todos os dados de teste
DO $$
BEGIN
    DELETE FROM "driver_advance_returns" WHERE "advance_id" IN (
        SELECT id FROM "driver_advances" WHERE "driver_id" = '8d9d548a-6d91-4888-b437-95935ac0ea71'
    );

    DELETE FROM "driver_advances" WHERE "driver_id" = '8d9d548a-6d91-4888-b437-95935ac0ea71';

    DELETE FROM "withdrawal_requests" WHERE "wallet_id" = 'wallet-test-001';

    DELETE FROM "driver_wallet_transactions" WHERE "wallet_id" = 'wallet-test-001';

    DELETE FROM "driver_wallets" WHERE "id" = 'wallet-test-001';
END $$;
```

## 📝 Notas Importantes

1. **Valores em centavos:** Todos os valores monetários são armazenados em centavos (inteiros)
2. **Company ID:** Você DEVE substituir `'SEU_COMPANY_ID'` pelo ID real da empresa
3. **Driver ID:** O motorista já deve existir na tabela `drivers`
4. **Transações:** O tipo `UBERIZATION` será adicionado quando o backend for atualizado (usando `CREDIT` por enquanto)

## 🎨 Cores na UI

- **Verde:** Créditos (UBERIZATION, BONUS)
- **Vermelho:** Débitos (ADVANCE_RETURN, SAQUE)
- **Amarelo:** Pendente
- **Azul:** Parcial
- **Cinza:** Cancelado/Completed
