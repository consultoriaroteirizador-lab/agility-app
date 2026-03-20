# Plano de Implementação do Módulo de Faturamento (Billing)

## 1. Análise do Módulo Company Atual

### Estrutura Atual

```
src/company/
├── company.module.ts
├── controller/
│   └── company.controller.ts
├── dto/
│   ├── create-company.dto.ts
│   └── update-company.dto.ts
├── entities/
│   └── company.entity.ts
├── mapper/
│   └── company.mapper.ts
├── repository/
│   ├── company.repository.ts
│   └── impl/prisma-company.repository.ts
└── service/
    ├── company.service.ts
    ├── company-data.service.ts
    ├── company-validation.service.ts
    └── company-notification.service.ts
```

### Campos Relacionados a Planos (Já Existentes)

- `subscriptionPlan`: string (apenas o nome do plano)
- `maxDrivers`, `maxVehicles`, `maxRoutingsPerDay`, `maxServicesPerRouting`: limites
- `featuresEnabled`: JSON com funcionalidades habilitadas
- `status`: ACTIVE, SUSPENDED, INACTIVE

---

## 2. Decisão de Arquitetura

**Recomendação: Criar um módulo separado `billing`** em vez de adicionar ao módulo `company`.

### Justificativas:

- Separação de responsabilidades (Single Responsibility Principle)
- O módulo de faturamento pode crescer com integrações de gateway de pagamento
- Facilita manutenção e testes
- Permite que o módulo seja reutilizado em outros contextos

---

## 3. Estrutura Proposta do Módulo Billing

```
src/billing/
├── billing.module.ts
├── controller/
│   ├── plan.controller.ts          # CRUD de planos
│   ├── subscription.controller.ts  # Gestão de assinaturas
│   └── invoice.controller.ts       # Histórico de faturas
├── dto/
│   ├── create-plan.dto.ts
│   ├── update-plan.dto.ts
│   ├── create-subscription.dto.ts
│   └── create-invoice.dto.ts
├── entities/
│   ├── plan.entity.ts
│   ├── subscription.entity.ts
│   └── invoice.entity.ts
├── mapper/
│   ├── plan.mapper.ts
│   ├── subscription.mapper.ts
│   └── invoice.mapper.ts
├── repository/
│   ├── plan.repository.ts
│   ├── subscription.repository.ts
│   └── invoice.repository.ts
└── service/
    ├── plan.service.ts
    ├── subscription.service.ts
    └── invoice.service.ts
```

---

## 4. Modelos de Dados (Schema Prisma)

### 4.1 Enums Adicionais

```prisma
enum SubscriptionStatus {
  ACTIVE      // Assinatura ativa
  PENDING     // Aguardando pagamento
  SUSPENDED   // Suspensa por inadimplência
  CANCELLED   // Cancelada
  EXPIRED     // Expirada

  @@schema("public")
}

enum BillingCycle {
  MONTHLY     // Cobrança mensal
  YEARLY      // Cobrança anual

  @@schema("public")
}

enum InvoiceStatus {
  DRAFT       // Rascunho
  PENDING     // Aguardando pagamento
  PAID        // Paga
  OVERDUE     // Vencida
  CANCELLED   // Cancelada
  REFUNDED    // Reembolsada

  @@schema("public")
}
```

### 4.2 Plan (Plano)

```prisma
model Plan {
  id                    String        @id @default(uuid())
  name                  String        @unique           // Slug do plano (ex: "basic", "premium")
  displayName           String        @map("display_name")  // Nome para exibição
  description           String?
  priceMonthly          Decimal       @map("price_monthly") @db.Decimal(10, 2)
  priceYearly           Decimal?      @map("price_yearly") @db.Decimal(10, 2)
  isActive              Boolean       @default(true) @map("is_active")

  // Limites do plano
  maxDrivers            Int?          @map("max_drivers")
  maxVehicles           Int?          @map("max_vehicles")
  maxRoutingsPerDay     Int?          @map("max_routings_per_day")
  maxServicesPerRouting Int?          @map("max_services_per_routing")

  // Features incluídas
  featuresEnabled       Json?         @map("features_enabled")  // { "ors": true, "broadcast": true, ... }

  // Metadata
  trialDays             Int?          @map("trial_days") @default(14)
  sortOrder             Int           @map("sort_order") @default(0)

  // Relacionamentos
  subscriptions         Subscription[]

  createdAt             DateTime      @default(now()) @map("created_at")
  updatedAt             DateTime      @updatedAt @map("updated_at")

  @@map("plans")
  @@schema("public")
}
```

### 4.3 Subscription (Assinatura)

```prisma
model Subscription {
  id              String             @id @default(uuid())
  companyId       String             @map("company_id")
  company         Company            @relation(fields: [companyId], references: [id])
  planId          String             @map("plan_id")
  plan            Plan               @relation(fields: [planId], references: [id])

  status          SubscriptionStatus @default(ACTIVE)
  billingCycle    BillingCycle       @default(MONTHLY)

  // Datas importantes
  startDate       DateTime           @map("start_date")
  endDate         DateTime?          @map("end_date")         // Data de término (se cancelada)
  trialEndDate    DateTime?          @map("trial_end_date")   // Fim do período de trial
  cancelledAt     DateTime?          @map("cancelled_at")     // Data do cancelamento

  // Preço atual (pode ser diferente do plano se tiver desconto personalizado)
  currentPrice    Decimal?           @map("current_price") @db.Decimal(10, 2)

  // Relacionamentos
  invoices        Invoice[]

  createdAt       DateTime           @default(now()) @map("created_at")
  updatedAt       DateTime           @updatedAt @map("updated_at")

  @@unique([companyId])  // Uma empresa só pode ter uma assinatura ativa
  @@map("subscriptions")
  @@schema("public")
}
```

### 4.4 Invoice (Fatura)

```prisma
model Invoice {
  id              String        @id @default(uuid())
  subscriptionId  String        @map("subscription_id")
  subscription    Subscription  @relation(fields: [subscriptionId], references: [id])
  companyId       String        @map("company_id")

  invoiceNumber   String        @unique @map("invoice_number")  // Número sequencial
  status          InvoiceStatus @default(PENDING)

  // Valores
  amount          Decimal       @db.Decimal(10, 2)        // Valor original
  discount        Decimal?      @db.Decimal(10, 2)        // Desconto aplicado
  totalAmount     Decimal       @map("total_amount") @db.Decimal(10, 2)  // Valor final

  // Datas
  dueDate         DateTime      @map("due_date")          // Data de vencimento
  paidAt          DateTime?     @map("paid_at")           // Data do pagamento

  // Período de referência
  periodStart     DateTime      @map("period_start")
  periodEnd       DateTime      @map("period_end")

  // Informações de pagamento
  paymentMethod   String?       @map("payment_method")    // PIX, BOLETO, CREDIT_CARD, etc.
  paymentRef      String?       @map("payment_ref")       // Referência do gateway de pagamento

  notes           String?       @db.Text

  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@index([companyId])
  @@index([companyId, status])
  @@index([subscriptionId])
  @@map("invoices")
  @@schema("public")
}
```

---

## 5. Funcionalidades por Entidade

### 5.1 Planos (Plans)

| Funcionalidade  | Descrição                               |
| --------------- | --------------------------------------- |
| Criar plano     | Criar novo plano com limites e features |
| Listar planos   | Listar todos os planos ativos           |
| Obter plano     | Obter detalhes de um plano específico   |
| Atualizar plano | Atualizar dados, preços, limites        |
| Desativar plano | Desativar plano (não remove do banco)   |
| Ativar plano    | Reativar plano desativado               |

### 5.2 Assinaturas (Subscriptions)

| Funcionalidade       | Descrição                                |
| -------------------- | ---------------------------------------- |
| Criar assinatura     | Vincular empresa a um plano              |
| Listar assinaturas   | Listar com filtros (status, plano, etc.) |
| Obter assinatura     | Obter assinatura de uma empresa          |
| Alterar plano        | Upgrade ou downgrade de plano            |
| Cancelar assinatura  | Cancelar assinatura da empresa           |
| Suspender assinatura | Suspender por inadimplência              |
| Reativar assinatura  | Reativar assinatura suspensa             |

### 5.3 Faturas (Invoices)

| Funcionalidade   | Descrição                                     |
| ---------------- | --------------------------------------------- |
| Criar fatura     | Criar fatura manual ou automaticamente        |
| Listar faturas   | Listar com filtros (empresa, status, período) |
| Obter fatura     | Obter detalhes de uma fatura                  |
| Marcar como paga | Registrar pagamento                           |
| Cancelar fatura  | Cancelar fatura                               |
| Histórico        | Histórico completo de faturas por empresa     |

---

## 6. Integração com Company

### 6.1 Modificações no CompanyService

1. **Ao criar empresa**:
   - Receber `planId` opcional no DTO
   - Se não informado, usar plano padrão (trial)
   - Criar assinatura automaticamente vinculada ao plano

2. **Campo `subscriptionPlan`**:
   - Manter para compatibilidade
   - Sincronizar automaticamente com o nome do plano da assinatura

3. **Verificação de status**:
   - Se assinatura suspensa → suspender acesso à plataforma
   - Implementar middleware/guard para verificação

### 6.2 Modificações no Company Entity

```typescript
// Adicionar relacionamento
subscriptions  Subscription[]
```

### 6.3 Modificações no CreateCompanyDto

```typescript
@ApiPropertyOptional({ description: 'ID do plano de assinatura' })
@IsString()
@IsOptional()
planId?: string;
```

---

## 7. Endpoints da API (Backoffice/Admin)

### 7.1 Plans

```
POST   /plans              # Criar plano
GET    /plans              # Listar planos
GET    /plans/:id          # Obter plano
PATCH  /plans/:id          # Atualizar plano
DELETE /plans/:id          # Desativar plano
```

### 7.2 Subscriptions

```
POST   /subscriptions              # Criar assinatura
GET    /subscriptions              # Listar assinaturas
GET    /subscriptions/:id          # Obter assinatura
GET    /subscriptions/company/:id  # Assinatura da empresa
PATCH  /subscriptions/:id          # Alterar assinatura
POST   /subscriptions/:id/cancel   # Cancelar assinatura
POST   /subscriptions/:id/suspend  # Suspender assinatura
POST   /subscriptions/:id/reactivate # Reativar assinatura
```

### 7.3 Invoices

```
POST   /invoices                   # Criar fatura
GET    /invoices                   # Listar faturas (com filtros)
GET    /invoices/:id               # Obter fatura
GET    /invoices/company/:id       # Faturas da empresa
POST   /invoices/:id/pay           # Marcar como paga
POST   /invoices/:id/cancel        # Cancelar fatura
POST   /invoices/:id/send          # Reenviar fatura/lembrete
```

---

## 8. Próximos Passos (Ordem de Implementação)

### Fase 1: Infraestrutura

1. [ ] Criar enums no schema Prisma
2. [ ] Criar modelo Plan no schema Prisma
3. [ ] Criar modelo Subscription no schema Prisma
4. [ ] Criar modelo Invoice no schema Prisma
5. [ ] Adicionar relacionamentos com Company
6. [ ] Gerar e executar migration

### Fase 2: Módulo Billing - Planos

7. [ ] Criar estrutura de pastas do módulo billing
8. [ ] Implementar PlanEntity
9. [ ] Implementar DTOs (CreatePlanDto, UpdatePlanDto)
10. [ ] Implementar PlanMapper
11. [ ] Implementar PlanRepository (interface e Prisma)
12. [ ] Implementar PlanService
13. [ ] Implementar PlanController

### Fase 3: Módulo Billing - Assinaturas

14. [ ] Implementar SubscriptionEntity
15. [ ] Implementar DTOs (CreateSubscriptionDto, UpdateSubscriptionDto)
16. [ ] Implementar SubscriptionMapper
17. [ ] Implementar SubscriptionRepository
18. [ ] Implementar SubscriptionService
19. [ ] Implementar SubscriptionController

### Fase 4: Módulo Billing - Faturas

20. [ ] Implementar InvoiceEntity
21. [ ] Implementar DTOs (CreateInvoiceDto)
22. [ ] Implementar InvoiceMapper
23. [ ] Implementar InvoiceRepository
24. [ ] Implementar InvoiceService
25. [ ] Implementar InvoiceController

### Fase 5: Integração

26. [ ] Modificar CreateCompanyDto para aceitar planId
27. [ ] Modificar CompanyService para criar assinatura
28. [ ] Atualizar CompanyEntity com relacionamento
29. [ ] Criar BillingModule e exportar serviços
30. [ ] Importar BillingModule no CompanyModule

### Fase 6: Testes e Documentação

31. [ ] Testar endpoints de Planos
32. [ ] Testar endpoints de Assinaturas
33. [ ] Testar endpoints de Faturas
34. [ ] Testar fluxo completo de criação de empresa
35. [ ] Documentar API com Swagger

---

## 9. Perguntas para Validação

Antes de iniciar a implementação, confirmar:

1. **Integração de Pagamento**: Deseja já preparar para integração com algum gateway (Stripe, Asaas, Mercado Pago) ou faremos apenas controle manual inicialmente?

2. **Trial**: O período de trial deve ser automático ao criar empresa? Qual o padrão de dias (14 dias)?

3. **Ações Automáticas**: Deseja que o sistema suspenda automaticamente empresas com faturas vencidas após X dias?

4. **Número da Fatura**: Qual formato deseja para o número da fatura? (ex: `INV-000001`, `2026-000001`)

---

## 10. Considerações Futuras

### Integração com Gateway de Pagamento

- Preparar campos para referência externa (`paymentRef`)
- Implementar webhooks para confirmação automática de pagamento
- Suporte a múltiplos métodos (PIX, Boleto, Cartão)

### Automações

- Geração automática de faturas recorrentes
- Lembretes de vencimento por email
- Suspensão automática por inadimplência
- Relatórios de receita

### Métricas

- MRR (Monthly Recurring Revenue)
- Churn rate
- LTV (Lifetime Value)
