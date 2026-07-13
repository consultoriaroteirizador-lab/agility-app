# Transferência de malha — fechamento do trecho, retorno monitorável e conferência por pedido

**Data:** 2026-07-13
**Épico:** cross-docking rede multi-trecho (malha) — execução do trecho no app do motorista
**Repos:** `agility-services` (backend) + `lab-app` (app do motorista). Monitoramento web (`agility-frontend-platform`): **sem mudança** (já deriva "em retorno").
**Continuação de:** handoff do motorista (#325) + redesign 2 telas (`feat/app-transferencia-malha`).

---

## 1. Objetivo

Fechar o ciclo de execução de um trecho de TRANSFERÊNCIA no app, com os **mesmos fundamentos do last-mile**:

1. **Fechar o trecho** — hoje o `custody.handoff` move a carga mas **não conclui a rota**; o trecho fica `IN_PROGRESS` pra sempre (e o tracking do app nunca desliga).
2. **Retorno monitorável** — quando o trecho tem retorno (`return_to_origin`/`monitor_return`), o motorista **não finaliza no CD destino**: entra em **"em retorno"** (a central vê o caminhão voltando no monitoramento) e só finaliza ao **chegar no CD de origem e fazer o check-in** — idêntico ao last-mile.
3. **Conferência por pedido** (Fase 2) — hoje o handoff confirma o **lote inteiro** de uma vez; falta poder marcar que um **pedido** não chegou/não foi entregue (motivo + observação) e conferir o que **volta** no retorno. É o análogo do check por material do last-mile, mas no grão do **pedido**.

**Princípio travado com o cliente:** retorno é um **fundamento transversal** — o mecanismo é sempre o mesmo do last-mile (Service `RETURN` + check-in na volta), independente de a autorização/entrada ser diferente.

## 2. Contexto — o que já existe (apurado no código + banco ao vivo)

Muita coisa já está pronta; o trabalho é **fiação**, não invenção:

- **Materialização do RETURN já existe:** `ReturnStopService.createReturnStop(params): Promise<string|null>` (`optimization/services/return-stop.service.ts:80`) cria o Service `serviceType='RETURN'` (última parada, `assignedToId=driver`, destino via `returnToOrigin ? originAddressId : returnAddressId`), guarda internamente `hasReturn() && monitorReturn()`, e devolve o `returnServiceId`. **Hoje só roda na otimização de last-mile** — por isso o trecho TRANSFER (que não passa pela otimização de last-mile) fica com `return_service_id=null` mesmo com `return_to_origin=true`.
- **Gate de fechamento já existe:** `RoutingService.complete(id)` (`routing.service.ts:1076`) já bloqueia: se `returnServiceId() && monitorReturn()` e o RETURN não está `COMPLETED/FAILED` → `ConflictException('Finalize o retorno antes de concluir a roteirização.')`. Ou seja, a regra "só fecha depois do retorno" **já está implementada** — basta o trecho ter o RETURN materializado + chamar `complete()`.
- **Monitoramento já mostra "em retorno":** deriva de um Service `RETURN` pendente sendo a última parada (`monitor_return`). **Nenhuma mudança no web.**
- **App já tem fluxo de retorno:** telas `parada/[pid]/retorno/` (check-in + conferência de devolução) usadas pelo last-mile.
- **NÃO existe status `RETURNING`** no enum `RoutingStatus` — e não vamos criar: "em retorno" é derivado, como no last-mile.

**Estado vivo do trecho de teste `RHBPBUC`** (confirmado via NodePort do postgres): TRANSFER, IN_PROGRESS, CD Osasco→CD SJC, `return_to_origin=true`, `monitor_return=true`, **`return_service_id=null`** (RETURN não materializado), 3 pedidos `DELIVERY` `AT_ORIGIN` **sem `planned_routing_id`**, malha **sem trecho last-mile**. Implicações: (a) precisa materializar o RETURN pra testar o retorno; (b) sem last-mile na malha + sem plano, a carga para no `AT_HUB` do CD destino (não vira entrega) — problema de **setup da malha**, fora do escopo deste épico.

## 3. Escopo

**Fase 1 (fechar + retorno) — DENTRO:**
- Backend: no handoff, **bifurcar por `hasReturn()`** — sem retorno → `complete()` (fecha); com retorno → `createReturnStop()` (materializa RETURN + `return_service_id`) e **mantém `IN_PROGRESS`**.
- Backend: concluir o RETURN (check-in do motorista) destrava o `complete()` → trecho `COMPLETED`.
- App: após o handoff, **se `hasReturn`** → navegar pro fluxo de **retorno** (voltar ao CD origem + check-in), espelhando o last-mile, em vez da tela de sucesso; **senão** → sucesso/saída como hoje.

**Fase 2 (conferência por pedido) — DENTRO, depois:**
- Backend: o handoff passa a aceitar **resultado por pedido** (status + motivo/observação) em vez de só `serviceIds`. Pedido OK → `AT_HUB` (+ segue plano). Pedido exceção → **não avança**, marcado com motivo, e **volta com o motorista** pro CD origem (vira item da conferência de retorno).
- App: UI de conferência **por pedido** no handoff (toque rápido "confirmar todos" + abrir pedido pra marcar exceção/motivo), espelhando o check por material do last-mile; e conferência dos pedidos que voltaram no check-in de retorno.

**FORA:**
- Mudança no monitoramento web (já funciona).
- Novo status de routing (`RETURNING`) — não; "em retorno" é derivado.
- Setup da malha (criar trecho last-mile / `plannedRoutingId`) — problema de dado, não deste épico.
- Multi-hop de retorno (só CD destino → CD origem).

## 4. Arquitetura

### 4.1 Fase 1 — backend (`agility-services`)
- **`driverHandoff` / `custody.handoff`:** ao final do handoff (dentro ou logo após a tx de custódia), avaliar `routing.hasReturn()`:
  - **Sem retorno:** `routingService.complete(arrivingLegRoutingId)` → trecho `COMPLETED`.
  - **Com retorno:** se `routing.returnServiceId()` ainda é null, chamar `returnStopService.createReturnStop({ routingId })` pra materializar o RETURN (destino = CD origem via `returnToOrigin`); **não** chamar `complete()`. Trecho segue `IN_PROGRESS` só com o RETURN pendente → monitoramento mostra "em retorno".
  - Idempotência: se o RETURN já existe (`returnServiceId != null`), não recriar.
  - Wiring de módulo: `CustodyModule`/`RoutingController` já injeta `CustodyService`; adicionar acesso a `ReturnStopService` (do `OptimizationModule`) e/ou expor um método fino em `RoutingService` que encapsule "materializa retorno OU conclui" pra manter o controller magro.
- **Conclusão do retorno:** reusar o caminho existente de conclusão do Service `RETURN` (check-in) + `RoutingService.complete()`. O gate de `complete()` já valida. Confirmar que o app do motorista consegue concluir o RETURN de um trecho TRANSFER pelos mesmos endpoints do last-mile (o RETURN é um Service normal com `serviceType=RETURN`).

### 4.2 Fase 1 — app (`lab-app`)
- **Pós-handoff no `TransferComprovanteStep`:** hoje `onSuccess` → tela de sucesso → `router.replace('/(auth)/(tabs)')`. Passa a: se `routing.hasReturn` (campo novo no `RoutingResponse` do app, aditivo) → navegar pro fluxo de **retorno** do trecho (voltar ao CD origem + check-in), reusando as telas `parada/[pid]/retorno/`; senão → sucesso/saída como hoje.
- **Mapa/UX do retorno:** reusar o padrão do last-mile (linha de volta CD destino→CD origem já é desenhada no web; no app, o fluxo de retorno já existe). O trecho de volta é monitorável — o tracking continua ligado (o trecho segue `IN_PROGRESS`), que é justamente o que a central precisa.
- **Campo `hasReturn`** no `RoutingResponse` do app (deriva de `returnToOrigin || (returnLatitude && returnLongitude)`, já exposto pelo backend no `toResponse`).

### 4.3 Fase 2 — conferência por pedido
- **Backend:** `DriverHandoffDto` ganha um formato por pedido — ex.: `items: [{ serviceId, outcome: 'RECEIVED'|'NOT_RECEIVED', reason?, notes? }]` (mantendo `proof` do lote pro comprovante geral). `custody.handoff`:
  - `RECEIVED` → fluxo atual (`AT_HUB` + segue plano).
  - `NOT_RECEIVED` → **não** avança pra `AT_HUB`; marca o pedido com o motivo (reusar o conceito de "insucesso"/`deliveryOutcome=WITH_ISSUES` do last-mile no grão do serviço) e mantém vinculado ao trecho pra **voltar** com o motorista.
  - Backward-compat: sem `items`, cai no comportamento atual (lote inteiro RECEIVED).
- **App:** no `TransferComprovanteStep`, a lista de pedidos (`TransferOrderList`) ganha marcação de exceção por card (padrão do check de material: toque rápido confirma todos; abrir um pedido permite marcar "não recebido" + motivo + observação). No check-in de retorno, conferir os pedidos que voltaram.
- **Motivos (enum enxuto):** espelhar os do last-mile onde fizer sentido no grão de pedido (ex.: `DAMAGED`, `MISSING`, `REFUSED`, `OTHER` + observação livre). Definir a lista exata na Fase 2.

## 5. Fluxo de dados (Fase 1)

`handoff(CD destino)` → custódia move a carga → **branch por `hasReturn`**: sem retorno = `complete()` → `COMPLETED`; com retorno = `createReturnStop()` → RETURN pendente, trecho `IN_PROGRESS` → monitoramento "em retorno" → motorista dirige ao CD origem → conclui RETURN (check-in/conferência) → `complete()` (gate passa) → `COMPLETED`, tracking desliga.

## 6. Tratamento de erros / degradação

- **`createReturnStop` retorna null** (sem endereço de retorno / falha): logar; não bloquear o handoff (a carga já foi entregue). Decisão de fallback: se não materializar o RETURN, **concluir o trecho** (não deixar preso IN_PROGRESS sem RETURN) — Fase 1 define o comportamento exato.
- **RETURN já materializado:** idempotente, não recria.
- **Trecho sem retorno:** conclui direto (comportamento novo, resolve o gap principal).
- **App sem `hasReturn`:** fluxo atual (sucesso/saída) — degradação segura.
- **Concluir RETURN de trecho TRANSFER:** se algum endpoint de conclusão assumir contexto de last-mile, ajustar pra ser agnóstico (o RETURN é um Service comum).

## 7. Testes

- **Gate = smoke manual (demo):**
  - **Sem retorno:** abrir trecho → handoff → trecho vira `COMPLETED`, some do "em andamento", tracking desliga.
  - **Com retorno (RHBPBUC, após materializar):** handoff → app leva pro retorno → monitoramento mostra "em retorno" (central vê o caminhão) → chegar no CD origem → check-in → trecho `COMPLETED`.
- **Backend:** testes de `handoff` cobrindo os dois ramos (com/sem retorno) — materializa RETURN vs conclui; idempotência do RETURN; gate de `complete()`.
- **Helpers puros** onde extraível (ex.: decisão "materializa vs conclui").

## 8. Estrutura de arquivos (unidades)

**Backend (`agility-services`):**
- `routing/controller/routing.controller.ts` (`driverHandoff`) e/ou `custody/custody.service.ts` (`handoff`) — bifurcação com/sem retorno.
- `routing/service/routing.service.ts` — método fino "materializa retorno OU conclui" (mantém controller magro); reusa `complete()` + `ReturnStopService.createReturnStop()`.
- Wiring de módulo pra `ReturnStopService` no ciclo do handoff.

**App (`lab-app`):**
- `routing/dto/response/routing.response.ts` — `hasReturn?: boolean` (aditivo).
- `.../_components/TransferComprovanteStep.tsx` — `onSuccess` bifurca: retorno vs saída.
- Reuso do fluxo `parada/[pid]/retorno/` pro check-in do retorno do trecho.

**Fase 2 (depois):** `DriverHandoffDto` por pedido; `custody.handoff` por outcome; `TransferOrderList`/card com marcação de exceção; conferência de retorno.

## 9. Faseamento

- **Fase 1 — fechar + retorno:** bifurcação no handoff (`complete()` vs `createReturnStop()`) + `hasReturn` no app + navegação pro retorno pós-handoff + check-in conclui o trecho. Espelho direto do last-mile, baixo risco (reusa `complete()`/`createReturnStop()` prontos).
- **Fase 2 — conferência por pedido:** outcome por pedido no handoff (exceção + motivo) + UI no app + conferência dos que voltaram no retorno.

## 10. Follow-ups

- Setup da malha de teste com trecho last-mile (pra testar transferência → entrega ponta a ponta).
- Materializar o RETURN também em quem já está `IN_PROGRESS` com `return_to_origin=true` e `return_service_id=null` (backfill do trecho de teste, se quiser testar sem recriar).
- Fase 2: definir enum final de motivos de exceção por pedido.
