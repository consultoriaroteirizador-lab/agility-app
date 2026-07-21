# Finalização de service/routing pelo operador da central, com audit

- **Data:** 2026-07-21
- **Status:** Design aprovado (aguardando plano de implementação)
- **Repos afetados:** `agility-services` (backend), `agility-frontend-platform` (frontend/central)
- **Não afeta:** `lab-app` (app do motorista) — permanece intocado por design

## Problema

Hoje a finalização de um **service** e de uma **routing** só acontece de forma rica pelo app do motorista (`lab-app`), com captura de evidência (recebedor, foto, assinatura, GPS, pagamento). Quando o motorista não consegue finalizar (sem app, sem sinal, encerrou expediente, entregou mas não registrou), a operação fica travada.

A plataforma da central (`agility-frontend-platform`, tela `monitoring/routings/[routingId]/edit`) já permite ao operador concluir/cancelar routing e completar service, inclusive com um confirm *"ainda existem N serviços pendentes, concluir mesmo assim?"* — **mas sem motivo, sem ator, sem trilha de auditoria**. Não há registro de **quem** finalizou pela central nem **por quê**.

## Objetivo

Permitir que o operador finalize, da central, **um service individual e depois a routing inteira**, sempre registrando **motivo estruturado** e gravando uma **trilha imutável de auditoria** que deixa claro **quem finalizou e por quê**, exibindo isso no monitoramento.

## Decisões travadas (do brainstorming)

1. **Semântica:** fechamento administrativo (o operador não está no local, não captura evidência física do cliente). É um **override** com motivo obrigatório.
2. **Escopo desta entrega:** finalizar **service individual** → e depois **finalizar a routing**. Fora do escopo (fase 2): marcar service como `FAILED`, e handoff/retorno de cross-docking.
3. **Backend incluso** no spec (`agility-services`).
4. **Gate do motivo:** **sempre** que o operador finalizar (service ou routing). O fluxo do motorista no app continua sem gate.
5. **Visibilidade:** **gravar + mostrar** no monitoramento (painel âmbar + selo por linha).
6. **Arquitetura:** Abordagem A — reusar a pilha de override-audit existente, com **dois kinds** novos (service e routing).

## Contexto do código existente (o que já está pronto)

### Backend (`agility-services`)
- **Domínio override-audit** já existe (branch mesclado): `src/override-audit/`.
  - `entities/override-audit.entity.ts`: `OVERRIDE_KINDS` (4 kinds atuais), `REASON_CODES_BY_KIND`, `isValidReason(kind, code)`, `OverrideAuditPersistenceData`.
  - `service/override-audit.service.ts`: `newDecisionId()`, `record(input, tx?)` — **congela `actorId/actorName/actorType/branchId` do contexto** (`getActor()`), re-valida motivo, rejeita `OUTRO` sem texto.
  - `repository/` append-only (só `record`/`findByRoutingId`/`findMany`).
  - Tabela `routing_overrides` (migration `20260719000000_add_routing_overrides`): colunas `kind`/`reason_code`/`actor_type` são **TEXT livre** (novos kinds **não precisam de migration**). RLS habilitado + forçado por `company_id`.
- **Gate `OVERRIDE_REASON_REQUIRED`** hoje é inline em 3 lugares (`routing.service.ts:1120`, `optimization.service.ts:375,940`), todos com o envelope `{ code:'OVERRIDE_REASON_REQUIRED', message, violations, validReasonCodes }`. DTO do motivo: `AssignWithReasonDto { reasonCode?, reasonText? }`.
- **Actor:** `ActorType = 'USER' | 'DRIVER' | 'SYSTEM' | 'INTEGRATOR'` (`context/tenant.context.ts`). `buildActorFromClaims`: `type = claims.driver_id ? 'DRIVER' : 'USER'`. **Operador da central = `'USER'`** (não tem `driver_id`). Não existe `'OPERATOR'`.
- **Endpoints de complete** (todos `TenantRequiredGuard, JwtAuthGuard, RolesGuard`, hoje **sem motivo, sem audit**):
  - `PATCH /services/:id/complete` → `serviceService.complete(id, notes)`. Transição válida hoje: **só `IN_PROGRESS`/`IN_ATTENDANCE → COMPLETED`**.
  - `POST /services/:id/completion-details` → `serviceService.completeWithDetails(...)`.
  - `PATCH /routings/:id/complete` → `routingService.complete(id)`. Domínio: **só `IN_PROGRESS`** completa. `atomicCompleteRouting` = `updateMany` (não transacional hoje).
- Precedente de carimbo de ator: `service_status_history` já grava `changedBy/changedByType` (não usado pra routing).

### Frontend (`agility-frontend-platform`)
- Tela `src/app/monitoring/routings/[routingId]/edit/page.tsx` já faz complete/cancel/start/publish routing + start/complete service. `CompleteServiceModal` captura `completionNotes/receivedValue/paymentMethod/receivedBy`. Botão "Concluir" já avisa sobre services pendentes.
- **Domínio `src/domain/agility/override-audit/`** (read-only): `OverrideAuditResponse` com `actorId/actorName/actorType`, `overrideAuditAPI` (`GET /routings/:id/overrides`, `GET /overrides`), `useFindOverridesByRouting`, `overrideAuditGrouping` (agrupa por decisão), `overrideAuditReasons` (`REASON_CODES_BY_KIND`, `OVERRIDE_KIND_LABELS`, `getReasonOptions`, `extractOverrideReasonRequiredError`).
- `ReasonPromptModal` genérico já usado em `AssignDriverModal`/`AssignVehicleModal` (padrão 400→prompt→retry).
- Painel âmbar de audit já renderizado em `roteirization/new/result/components/RoutingDetailPanel.tsx` via `useFindOverridesByRouting` — **ainda não usado no monitoramento**.
- Identidade do operador via `useAuth()` (`src/context/auth/AuthProvider.tsx`): `collaboratorId`, `userName`, roles.

## Arquitetura da solução

### Backend

**1. Novos kinds + catálogo** — `override-audit.entity.ts` (sem migration):
```
OVERRIDE_KINDS += 'OPERATOR_SERVICE_FINALIZATION', 'OPERATOR_ROUTING_FINALIZATION'

REASON_CODES_BY_KIND:
  OPERATOR_SERVICE_FINALIZATION: [
    'DRIVER_APP_UNAVAILABLE',
    'CUSTOMER_CONFIRMED_OFFLINE',
    'DRIVER_UNREACHABLE',
    'DELIVERED_NOT_REGISTERED',
    'OUTRO',
  ]
  OPERATOR_ROUTING_FINALIZATION: [
    'ALL_SERVICES_HANDLED',
    'DRIVER_ENDED_SHIFT',
    'DRIVER_APP_UNAVAILABLE',
    'OUTRO',
  ]
```
> Códigos/labels PT são propostas; ajustáveis. `OUTRO` sempre exige `reasonText`.

**2. Gate diferenciado por ator.** Extrair a lógica hoje inline num helper reusável (ex.: `requireOverrideReason(kind, reason)`) que lança o envelope `400 OVERRIDE_REASON_REQUIRED { validReasonCodes: REASON_CODES_BY_KIND[kind] }`. Nos caminhos de complete, o gate dispara **apenas quando `getActor().type === 'USER'`** (operador). Motorista (`'DRIVER'`) não cai no gate.

**3. Semântica de *force* (só operador).** Ao finalizar como operador, o complete pode furar a transição normal: `PENDING`/`ASSIGNED`/`IN_PROGRESS`/`IN_ATTENDANCE → COMPLETED`, setando `startDate = now` se nulo. `overriddenValues` grava `{ fromStatus }` (service) e `{ fromStatus, pendingServiceIds }` (routing, quando houver pendências). O motorista permanece preso à transição normal (não consegue *force*).

**4. Ordem e atomicidade.** Seguindo a garantia do épico ("trilha gravada **antes** do efeito"), envolver `overrideAuditService.record(audit, tx)` + a mudança de estado no mesmo `runInTenantTransaction`: audit primeiro, efeito depois; rollback cobre ambos (sem efeito sem trilha, sem trilha órfã). O `atomicCompleteRouting` passa a rodar dentro dessa transação.

**5. Ator.** **Não** criar `actorType='OPERATOR'` (evita tocar `tenant.context` e todos os call-sites). Operador = `'USER'`; o **kind `OPERATOR_*` + `actorName`** (resolvido do collaborator) já deixam inequívoco que foi a central e **quem** foi.

**6. DTOs.** `ServiceCompletionDetailsDto` e os bodies de `PATCH /services/:id/complete` e `PATCH /routings/:id/complete` ganham `reasonCode?` / `reasonText?` (opcionais no DTO; exigidos pelo gate só para operador).

### Frontend (central)

**1. Local:** tudo na página `monitoring/routings/[routingId]/edit/page.tsx`, sem tela nova.

**2. Captura de motivo proativa.** Como o gate sempre dispara para o operador, o seletor de motivo entra direto nos modais (sem depender do round-trip 400):
- **Service:** estender `CompleteServiceModal` com seletor de `reasonCode` + `reasonText` (obrigatório quando `OUTRO`). Enviar `reasonCode/reasonText` no complete.
- **Routing:** o botão "Concluir" abre um `FinalizeRoutingModal` com o mesmo seletor, mantendo o aviso de services pendentes.
- **Rede de segurança:** manter o handler de `OVERRIDE_REASON_REQUIRED` (`extractOverrideReasonRequiredError`) — se o back rejeitar, reabre o modal com os `validReasonCodes` do 400. Backend segue como fonte da verdade.

**3. Catálogo no front.** Espelhar os dois novos kinds em `overrideAuditReasons.ts` (`REASON_CODES_BY_KIND`, `OVERRIDE_KIND_LABELS`, labels PT). O 400 continua sendo o fallback autoritativo.

**4. Exibição do "quem finalizou".** Ligar `useFindOverridesByRouting(routingId)` na página de monitoramento:
- **Painel** âmbar "Finalizações pela central" reusando o padrão do `RoutingDetailPanel` (extrair para `OverrideAuditPanel` compartilhado se ficar limpo): por decisão, *"Finalizado por [operador] — [motivo] — [data]"*.
- **Selo por linha** na `RoutingServicesTable`: service finalizado pela central ganha badge discreto com tooltip (operador + motivo).

**5. Mutations.** Estender `useCompleteService` / `useCompleteRouting` para carregar `reasonCode/reasonText` no body (hoje vazio). `useChangeServiceStatus` fica de fora.

## Fluxo / ciclo de vida

1. Operador finaliza os services **um a um** — cada complete grava uma linha `OPERATOR_SERVICE_FINALIZATION` (seu próprio `decisionId`, ator, motivo).
2. Operador **finaliza a routing** — grava uma linha `OPERATOR_ROUTING_FINALIZATION`.
3. Cada finalização = 1 decisão = 1 ator + 1 motivo.
4. O motorista, em paralelo pelo app, segue o fluxo normal sem gate (`DRIVER`).

## Edge cases / tratamento de erros

- **Rota com services pendentes:** permitido (force), motivo obrigatório; `overriddenValues.pendingServiceIds` registra os pendentes. Confirm "concluir mesmo assim?" acoplado ao seletor de motivo.
- **Já finalizado:** routing `COMPLETED` → mantém `409 Conflict` (idempotência atual); front mostra estado atual.
- **Falha no meio:** audit + efeito na mesma transação → ou grava os dois, ou nenhum.
- **`OUTRO` sem texto:** rejeitado no back (`record`) e barrado no front antes de enviar.
- **Motorista chamando complete:** `actorType='DRIVER'` → sem gate, transição normal (não consegue *force*). App intocado.
- **RLS/tenant:** endpoints já guardados; `record` congela `companyId/branchId` do contexto.

## Testes

**Backend (unit):**
- Gate dispara para `USER` sem motivo (envelope 400 + `validReasonCodes`).
- Passa com motivo válido; `DRIVER` ignora o gate (sem motivo, transição normal).
- Force `PENDING→COMPLETED` só para operador; motorista não consegue force.
- Linha de audit com `kind`/`actorId`/`actorName`/`reasonCode` corretos.
- Audit-antes-do-efeito: rollback não deixa órfã nem efeito.
- `OUTRO` sem `reasonText` rejeitado.

**Frontend:**
- Modal exige `reasonCode`; `OUTRO` exige `reasonText`.
- Envio de `reasonCode/reasonText` no complete de service e routing.
- Fallback do `OVERRIDE_REASON_REQUIRED` reabre o modal com `validReasonCodes`.
- Painel + selo renderizam a partir de `useFindOverridesByRouting`.

## Fora de escopo (fase 2)

- Marcar service como `FAILED` pela central com motivo.
- Handoff / retorno de cross-docking pela central.
- Relatório/consulta dedicada de finalizações (`GET /overrides` com filtro por kind) fora da tela de monitoramento.
