# Plano de Integração do Módulo de Billing no Frontend (agility-frontend-platform)

## 1. Análise do Contexto

### Backend (já implementado em agility-services)

O módulo de billing está completo com os seguintes endpoints:

#### Plans

- `POST /plans` - Criar plano
- `GET /plans` - Listar todos os planos
- `GET /plans/active` - Listar planos ativos
- `GET /plans/:id` - Obter plano por ID
- `PATCH /plans/:id` - Atualizar plano
- `POST /plans/:id/activate` - Ativar plano
- `POST /plans/:id/deactivate` - Desativar plano
- `DELETE /plans/:id` - Remover plano (soft delete)

#### Subscriptions

- `POST /subscriptions` - Criar assinatura
- `GET /subscriptions` - Listar todas assinaturas
- `GET /subscriptions/:id` - Obter assinatura por ID
- `GET /subscriptions/company/:companyId` - Assinatura por empresa
- `PATCH /subscriptions/:id` - Atualizar assinatura
- `POST /subscriptions/:id/cancel` - Cancelar assinatura
- `POST /subscriptions/:id/suspend` - Suspender assinatura
- `POST /subscriptions/:id/reactivate` - Reativar assinatura

#### Invoices

- `POST /invoices` - Criar fatura
- `GET /invoices` - Listar faturas
- `GET /invoices/:id` - Obter fatura por ID
- `GET /invoices/company/:companyId` - Faturas por empresa
- `GET /invoices/subscription/:subscriptionId` - Faturas por assinatura
- `POST /invoices/:id/pay` - Marcar como paga
- `POST /invoices/:id/cancel` - Cancelar fatura
- `POST /invoices/:id/discount` - Aplicar desconto

### Frontend Atual (agility-frontend-platform)

- Admin em `/admin` com gerenciamento de empresas e usuários
- Sidebar com menus dinâmicos baseados em permissões
- Padrão de organização: `domain/agility/[entidade]/` com API, Service, DTOs, useCases
- `CreateCompanyModal` atual tem campo `subscriptionPlan` como string simples (hardcoded)

---

## 2. Estrutura Proposta

### 2.1 Domain Layer - Billing

```
src/domain/agility/billing/
├── plan/
│   ├── planAPI.ts
│   ├── planService.ts
│   ├── dto/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── request/
│   │   │   ├── index.ts
│   │   │   ├── create-plan.request.ts
│   │   │   └── update-plan.request.ts
│   │   └── response/
│   │       ├── index.ts
│   │       └── plan.response.ts
│   └── useCase/
│       ├── index.ts
│       ├── useCreatePlan.ts
│       ├── useFindAllPlans.ts
│       ├── useFindActivePlans.ts
│       ├── useFindOnePlan.ts
│       ├── useUpdatePlan.ts
│       ├── useActivatePlan.ts
│       └── useDeactivatePlan.ts
├── subscription/
│   ├── subscriptionAPI.ts
│   ├── subscriptionService.ts
│   ├── dto/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── request/
│   │   │   ├── index.ts
│   │   │   ├── create-subscription.request.ts
│   │   │   └── update-subscription.request.ts
│   │   └── response/
│   │       ├── index.ts
│   │       └── subscription.response.ts
│   └── useCase/
│       ├── index.ts
│       ├── useCreateSubscription.ts
│       ├── useFindAllSubscriptions.ts
│       ├── useFindSubscriptionByCompany.ts
│       ├── useUpdateSubscription.ts
│       ├── useCancelSubscription.ts
│       ├── useSuspendSubscription.ts
│       └── useReactivateSubscription.ts
└── invoice/
    ├── invoiceAPI.ts
    ├── invoiceService.ts
    ├── dto/
    │   ├── index.ts
    │   ├── types.ts
    │   ├── request/
    │   │   ├── index.ts
    │   │   └── create-invoice.request.ts
    │   └── response/
    │       ├── index.ts
    │       └── invoice.response.ts
    └── useCase/
        ├── index.ts
        ├── useCreateInvoice.ts
        ├── useFindAllInvoices.ts
        ├── useFindInvoicesByCompany.ts
        ├── useMarkInvoiceAsPaid.ts
        ├── useCancelInvoice.ts
        └── useApplyDiscountInvoice.ts
```

### 2.2 Admin Pages

```
src/app/admin/
├── companies/              # já existe
│   └── components/
│       └── CreateCompanyModal.tsx  # modificar para usar planId
├── plans/                  # NOVO
│   ├── page.tsx
│   ├── PlansManagementPage.tsx
│   └── components/
│       ├── PlansList.tsx
│       ├── CreatePlanModal.tsx
│       └── EditPlanModal.tsx
├── subscriptions/          # NOVO
│   ├── page.tsx
│   ├── SubscriptionsManagementPage.tsx
│   └── components/
│       ├── SubscriptionsList.tsx
│       ├── SubscriptionDetails.tsx
│       └── ChangePlanModal.tsx
└── invoices/               # NOVO
    ├── page.tsx
    ├── InvoicesManagementPage.tsx
    └── components/
        ├── InvoicesList.tsx
        ├── InvoiceDetails.tsx
        ├── CreateInvoiceModal.tsx
        └── PaymentModal.tsx
```

---

## 3. Tipos e Interfaces

### 3.1 Plan Types

```typescript
// types.ts
export interface PlanLimits {
  maxDrivers?: number;
  maxVehicles?: number;
  maxRoutingsPerDay?: number;
  maxServicesPerRouting?: number;
}

export interface FeaturesEnabled {
  ors?: boolean;
  broadcast?: boolean;
  shipments?: boolean;
  skills?: boolean;
  timeWindows?: boolean;
  capacity?: boolean;
  zones?: boolean;
  [key: string]: boolean | undefined;
}

export interface PlanResponse {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  priceMonthly: number;
  priceYearly?: number;
  isActive: boolean;
  limits: PlanLimits;
  featuresEnabled?: FeaturesEnabled;
  trialDays?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanRequest {
  name: string;
  displayName: string;
  description?: string;
  priceMonthly: number;
  priceYearly?: number;
  isActive?: boolean;
  maxDrivers?: number;
  maxVehicles?: number;
  maxRoutingsPerDay?: number;
  maxServicesPerRouting?: number;
  featuresEnabled?: FeaturesEnabled;
  trialDays?: number;
  sortOrder?: number;
}

export interface UpdatePlanRequest {
  displayName?: string;
  description?: string;
  priceMonthly?: number;
  priceYearly?: number;
  maxDrivers?: number;
  maxVehicles?: number;
  maxRoutingsPerDay?: number;
  maxServicesPerRouting?: number;
  featuresEnabled?: FeaturesEnabled;
  trialDays?: number;
  sortOrder?: number;
}
```

### 3.2 Subscription Types

```typescript
// types.ts
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export interface SubscriptionResponse {
  id: string;
  companyId: string;
  company?: CompanyResponse;
  planId: string;
  plan?: PlanResponse;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  startDate: string;
  endDate?: string;
  trialEndDate?: string;
  cancelledAt?: string;
  currentPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionRequest {
  companyId: string;
  planId: string;
  billingCycle?: BillingCycle;
  startDate: string;
  trialEndDate?: string;
  currentPrice?: number;
}

export interface UpdateSubscriptionRequest {
  planId?: string;
  billingCycle?: BillingCycle;
  currentPrice?: number;
}
```

### 3.3 Invoice Types

```typescript
// types.ts
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export interface InvoiceResponse {
  id: string;
  subscriptionId: string;
  subscription?: SubscriptionResponse;
  companyId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  amount: number;
  discount?: number;
  totalAmount: number;
  dueDate: string;
  paidAt?: string;
  periodStart: string;
  periodEnd: string;
  paymentMethod?: string;
  paymentRef?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceRequest {
  subscriptionId: string;
  companyId: string;
  amount: number;
  discount?: number;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}

export interface MarkAsPaidRequest {
  paymentMethod: string;
  paymentRef?: string;
}

export interface ApplyDiscountRequest {
  discount: number;
}
```

---

## 4. Funcionalidades por Tela

### 4.1 Planos (Plans)

| Funcionalidade   | Descrição                                                                |
| ---------------- | ------------------------------------------------------------------------ |
| Listar planos    | Tabela com nome, preço mensal/anual, status, trial days                  |
| Criar plano      | Modal com todos os campos (nome, displayName, preços, limites, features) |
| Editar plano     | Modal de edição                                                          |
| Ativar/Desativar | Botões de ação na lista                                                  |
| Ordenação        | Campo de sortOrder                                                       |

**Campos do Modal de Criação/Edição:**

- Nome (slug): `name` - texto único
- Nome de exibição: `displayName` - texto
- Descrição: `description` - texto longo
- Preço mensal: `priceMonthly` - número
- Preço anual: `priceYearly` - número
- Dias de trial: `trialDays` - número
- Ordem: `sortOrder` - número
- Limites:
  - Máx. motoristas: `maxDrivers`
  - Máx. veículos: `maxVehicles`
  - Máx. roteirizações/dia: `maxRoutingsPerDay`
  - Máx. serviços/roteirização: `maxServicesPerRouting`
- Features habilitadas: checkboxes

### 4.2 Assinaturas (Subscriptions)

| Funcionalidade         | Descrição                                             |
| ---------------------- | ----------------------------------------------------- |
| Listar assinaturas     | Tabela com empresa, plano, status, ciclo, data início |
| Filtrar por status     | Dropdown com ACTIVE, SUSPENDED, CANCELLED, etc.       |
| Detalhes da assinatura | Drawer/Modal com informações completas                |
| Trocar plano           | Modal para upgrade/downgrade                          |
| Cancelar assinatura    | Ação com confirmação                                  |
| Suspender/Reativar     | Botões de ação                                        |

**Colunas da Lista:**

- Empresa
- Plano atual
- Status (badge colorido)
- Ciclo de cobrança
- Data de início
- Data de término (se cancelada)
- Ações

### 4.3 Faturas (Invoices)

| Funcionalidade      | Descrição                                             |
| ------------------- | ----------------------------------------------------- |
| Listar faturas      | Tabela com número, empresa, valor, status, vencimento |
| Filtrar por status  | Dropdown com PENDING, PAID, OVERDUE, CANCELLED        |
| Filtrar por empresa | Dropdown de empresas                                  |
| Criar fatura manual | Modal para criação manual                             |
| Marcar como paga    | Modal com método de pagamento                         |
| Aplicar desconto    | Modal com valor do desconto                           |
| Cancelar fatura     | Ação com confirmação                                  |

**Colunas da Lista:**

- Número da fatura
- Empresa
- Valor total
- Status (badge colorido)
- Data de vencimento
- Data de pagamento (se paga)
- Ações

---

## 5. Modificações na Sidebar

Adicionar ao menu `masterAdminMenuItems` no arquivo `src/components/common/Sidebar.tsx`:

```typescript
{
  id: "admin-plans",
  href: "/admin/plans",
  icon: "/images/coins.svg",
  label: "Planos",
  show: isMasterAdmin,
},
{
  id: "admin-subscriptions",
  href: "/admin/subscriptions",
  icon: "/images/repeat circle.svg",
  label: "Assinaturas",
  show: isMasterAdmin,
},
{
  id: "admin-invoices",
  href: "/admin/invoices",
  icon: "/images/finance.svg",
  label: "Faturas",
  show: isMasterAdmin,
},
```

---

## 6. Modificações no CreateCompanyModal

### Alterações necessárias:

1. **Buscar planos ativos da API** em vez de usar opções hardcoded
2. **Campo `planId`** em vez de `subscriptionPlan` string
3. **Exibir informações do plano selecionado** (preço, limites, features)

### Código de exemplo:

```typescript
// Buscar planos ativos
const { plans } = useFindActivePlans()

// No formulário
const [form, setForm] = useState<CreateCompanyRequest>({
  // ... outros campos
  planId: '', // novo campo
})

// No select
<select
  value={form.planId || ''}
  onChange={(e) => handleChange('planId', e.target.value)}
>
  <option value="">Selecione um plano</option>
  {plans?.map((plan) => (
    <option key={plan.id} value={plan.id}>
      {plan.displayName} - R$ {plan.priceMonthly.toFixed(2)}/mês
    </option>
  ))}
</select>
```

---

## 7. Ordem de Implementação

### Fase 1: Infraestrutura do Domain ✅

1. [x] Criar tipos e DTOs de Plan
2. [x] Criar tipos e DTOs de Subscription
3. [x] Criar tipos e DTOs de Invoice
4. [x] Implementar planAPI e planService
5. [x] Implementar subscriptionAPI e subscriptionService
6. [x] Implementar invoiceAPI e invoiceService
7. [x] Implementar useCases de Plan
8. [x] Implementar useCases de Subscription
9. [x] Implementar useCases de Invoice

### Fase 2: Página de Planos ✅

10. [x] Criar página PlansManagementPage
11. [x] Criar componente PlansList
12. [x] Criar modal CreatePlanModal
13. [x] Criar modal EditPlanModal
14. [x] Implementar ações de ativar/desativar

### Fase 3: Página de Assinaturas ✅

15. [x] Criar página SubscriptionsManagementPage
16. [x] Criar componente SubscriptionsList
17. [x] Implementar filtros por status
18. [ ] Criar modal SubscriptionDetails (opcional)
19. [ ] Criar modal ChangePlanModal (opcional)
20. [x] Implementar ações de cancelar/suspender/reativar

### Fase 4: Página de Faturas ✅

21. [x] Criar página InvoicesManagementPage
22. [x] Criar componente InvoicesList
23. [x] Implementar filtros por status e empresa
24. [ ] Criar modal CreateInvoiceModal (opcional)
25. [ ] Criar modal PaymentModal (opcional)
26. [ ] Implementar ação de aplicar desconto (opcional)

### Fase 5: Integração com Cadastro de Empresa

27. [ ] Modificar CreateCompanyModal para buscar planos da API
28. [ ] Adicionar campo planId ao formulário
29. [x] Atualizar Sidebar com novos menus

### Fase 6: Testes e Ajustes

30. [ ] Testar fluxo completo de criação de empresa com plano
31. [ ] Testar gestão de planos (CRUD)
32. [ ] Testar gestão de assinaturas
33. [ ] Testar gestão de faturas
34. [ ] Validar responsividade

---

## 8. Considerações de UX/UI

### Cores para Status

**Subscription Status:**

- ACTIVE: verde (`bg-green-100 text-green-800`)
- PENDING: amarelo (`bg-yellow-100 text-yellow-800`)
- SUSPENDED: laranja (`bg-orange-100 text-orange-800`)
- CANCELLED: vermelho (`bg-red-100 text-red-800`)
- EXPIRED: cinza (`bg-gray-100 text-gray-800`)

**Invoice Status:**

- DRAFT: cinza (`bg-gray-100 text-gray-800`)
- PENDING: amarelo (`bg-yellow-100 text-yellow-800`)
- PAID: verde (`bg-green-100 text-green-800`)
- OVERDUE: vermelho (`bg-red-100 text-red-800`)
- CANCELLED: cinza escuro (`bg-gray-200 text-gray-700`)
- REFUNDED: roxo (`bg-purple-100 text-purple-800`)

### Ícones Sugeridos

- Planos: `/images/coins.svg`
- Assinaturas: `/images/repeat circle.svg`
- Faturas: `/images/finance.svg`

---

## 9. Perguntas para Validação

1. **Permissões**: As novas páginas devem ser acessíveis apenas para `isMasterAdmin` ou também para outros perfis?

2. **Criação de faturas**: Deseja permitir apenas criação manual ou também geração automática baseada no ciclo?

3. **Notificações**: Deseja implementar notificações/toasts para ações bem-sucedidas?

4. **Exportação**: Deseja funcionalidade de exportar faturas para PDF ou Excel?

---

## 10. Próximos Passos

Após aprovação deste plano, iniciar a implementação seguindo a ordem das fases descritas na seção 7.
