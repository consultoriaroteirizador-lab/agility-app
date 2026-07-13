# App do motorista — Transferência de malha (handoff cross-docking)

**Data:** 2026-07-12
**Épico:** cross-docking rede multi-trecho (malha) — lado do app do motorista
**Repos:** `lab-app` (app do motorista, React Native + Expo Router) + `agility-services` (backend)
**Motivação:** demo fim-a-fim com o cliente — plataforma cria a malha, o motorista executa a **transferência** (CD1→CD2) com handoff/comprovante, e a carga segue pro last-mile.

---

## 1. Objetivo

Dar ao app do motorista a capacidade de **executar um trecho de TRANSFERÊNCIA de malha**: abrir o trecho (lote de pedidos CD1→CD2), e no CD de destino registrar o **handoff de custódia** (comprovante: quem recebeu + foto/assinatura), que move a carga para o próximo trecho (last-mile ou próximo CD). Hoje o app é **cego a trechos de malha** e nunca produz um handoff de custódia.

## 2. Contexto (estado atual — apurado no código)

**Há dois conceitos de "transferência", em NÍVEIS diferentes, e o app só tem o que NÃO serve à malha:**

- **`Service` com `serviceType=TRANSFER`** (o `transfer/` atual — a "uberização"): buscar no ponto A e levar pro ponto B, num único registro de `Service`, um motorista numa parada (modelo iFood/Uber). Funciona, captura comprovante, chama `POST /services/:id/completion-details`. **Não** é o trecho de malha — e **permanece 100% intacto**.
- **`Routing` com `legType=TRANSFER`** (a malha, nova): um **trecho/rota** carregando um **lote** de pedidos CD1→CD2, com `parentRoutingId`/`nextLegRoutingId`/`destinationFacilityId`. É **invisível** ao app hoje.

**Por que não colidem** (garantia de não-regressão): as duas chaveiam em campos e níveis distintos —
a uberização em `service.serviceType` (nível **parada**, `parada/[pid]/index.tsx`); a malha em `routing.legType`
(nível **rota**, `rotas-detalhadas/[id]/index.tsx`). São caminhos ortogonais; a nova NÃO toca no fluxo `serviceType=TRANSFER` existente.

**Por que o app não executa a transferência de malha:**

- `RoutingResponse`/`ServiceResponse` do app **não expõem** `legType`, `parentRoutingId`, `nextLegRoutingId`, `originFacilityName`/`destinationFacilityName`, `custodyPhase` — o backend serializa (`routing.entity.toJson()`), o app **descarta** (não estão no type).
- O roteamento de fluxo (`parada/[pid]/index.tsx`) decide só por `service.serviceType`, nunca por trecho de malha.
- Nada chama **`POST /custody/handoff`** → nenhum `CustodyHandoff` (comprovante), nenhuma transição de `custodyPhase`, e a carga **nunca "chega"** pra destravar o last-mile.
- **Role:** `POST /custody/handoff` (`custody.controller.ts`) exige `COLLABORATOR_ADMIN/MANAGER/SUPERVISOR/BRANCH_ADMIN`; o motorista é `COLLABORATOR` → **403**.

**Pronto pra reusar:** o scaffolding de comprovante (`SharedEtapaRecebedor` = quem recebeu + documento, `SignatureCanvas`, upload S3 de foto/assinatura), e toda a máquina de custódia no backend (`custody.service.handoff` — cria `CustodyHandoff`, move `custodyPhase` AT_HUB→IN_TRANSIT, re-vincula ao `nextLegRoutingId`).

## 3. Escopo

**Dentro (mínimo real p/ a demo):**
- App fica ciente do trecho: expor os campos de malha no `RoutingResponse` do app.
- Nova execução de **trecho de transferência**: cabeçalho CD→CD + lista do lote (conferência visual) + ação única de handoff no destino (comprovante) → chama o endpoint driver-scoped.
- Backend: novo endpoint **driver-scoped** `POST /routings/:id/handoff` (posse + derivação de contexto no servidor + chama `custody.handoff`).

**Fora (variantes futuras — o design NÃO pode engessá-las):**
- **Granularidade de conferência** por lote/palete ou por pedido (hoje: lote inteiro). Ver §6.
- **Multi-hop** (CD1→CD2→CD3→…). Ver §6.
- Comprovante-viewer na **plataforma web** (é o P1 do doc de subutilização — vem depois).
- Carregar/conferir no CD de **origem** (implícito na demo).

## 4. Arquitetura

### 4.1 App — ciência de trecho de malha
- Estender o `RoutingResponse` do app com os campos que o backend já manda: `legType?: 'TRANSFER' | 'LAST_MILE' | null`, `parentRoutingId?`, `nextLegRoutingId?`, `originFacilityName?`, `destinationFacilityName?` (e `custodyPhase?` no `ServiceResponse`, opcional). São aditivos — degradam para `undefined` em app/rota comum.
- No detalhe da rota (`rotas-detalhadas/[id]/index.tsx`): quando `routing.legType === 'TRANSFER'`, renderizar a **execução de transferência** (nova) em vez da lista de paradas de entrega. **Chavear em `legType`, nunca em "é a transferência"** (blindagem multi-hop, §6).

### 4.2 App — execução da transferência (nova)
Um trecho de transferência é **uma ação**, não N paradas:
- **Cabeçalho:** `originFacilityName → destinationFacilityName` (fallback ao `routing.name`, que já vem "Transferência CD X → CD Y").
- **Lote de carga:** lista dos pedidos do trecho (os `services` do routing) — conferência **visual** (sem seleção no v1).
- **Ação "Cheguei no CD destino → registrar entrega da carga":** abre a captura de **comprovante** reusando `SharedEtapaRecebedor` (quem recebeu + documento) + `SignatureCanvas` (assinatura) + upload de foto (S3). Validação: ≥1 foto **ou** assinatura (espelha o backend).
- **Confirmar** → chama `useRoutingHandoff` → sucesso → `SuccessScreen`.

Novo API/hook no app: `routingAPI.handoff(routingId, { proof, serviceIds? })` + `useRoutingHandoff`.

### 4.3 Backend — endpoint driver-scoped
`POST /routings/:id/handoff` (guard de motorista, role `COLLABORATOR`):
- **Posse:** valida que o ator (motorista do JWT) é o `driverId`/`assignedToId` do routing `:id`. Senão 403.
- **Deriva no servidor** (o driver não forja): `facilityId = routing.destinationFacilityId`, `arrivingLegRoutingId = routing.id`, `nextLegRoutingId = routing.nextLegRoutingId`, e `serviceIds` = **os do corpo se vierem, senão o lote inteiro do trecho** (todos os `services` do routing).
- **Corpo:** só o `proof` (`receivedBy`, `photoProof?: string[]`, `signature?`, `notes?`) + `serviceIds?` opcional.
- Chama internamente `custody.service.handoff({ facilityId, arrivingLegRoutingId, serviceIds, proof, nextLegRoutingId })` — reusa a transação existente (cria `CustodyHandoff`, `ServiceMovement`, move `custodyPhase`, re-vincula ao próximo trecho).
- Retorna o resultado do handoff (comprovante criado + resumo).

DTO novo: `DriverHandoffDto { proof: HandoffProofDto; serviceIds?: string[] }` (reusa o `CustodyHandoffProofDto` existente).

## 5. Fluxo de dados (fim-a-fim)

1. Plataforma cria a malha + **atribui o trecho de transferência a um motorista** (atribuição existente).
2. App lista as rotas do motorista → o trecho aparece (nome já descritivo "Transferência CD X → CD Y").
3. Motorista abre → `legType==='TRANSFER'` → tela de execução (CD→CD + lote).
4. No CD destino: "registrar entrega da carga" → comprovante → `POST /routings/:id/handoff`.
5. Backend: `custody.handoff` cria o comprovante, move a custódia e **re-vincula a carga ao `nextLegRoutingId`** (last-mile ou próximo CD).
6. O last-mile já fica com a carga → motorista abre o last-mile → entrega (**fluxo atual, já funciona**).

## 6. Preparação pro futuro (NÃO engessar)

Princípio central: **chavear sempre em `legType` + campos do próprio trecho**, e tratar o handoff como "lote de `serviceIds` + comprovante".

- **Granularidade de conferência (tudo / por lote-palete / por pedido):** o `custody.handoff` já aceita um **subconjunto de `serviceIds`** (suporte a chegada parcial). O endpoint driver-scoped recebe `serviceIds?` **opcional** (default = lote inteiro). No v1 a lista é só visual; ligar seleção por palete (um lote = um subconjunto) ou por pedido (checkbox por item) é **aditivo na UI**, **sem** mudança no backend nem na modelagem.
- **Multi-hop (CD1→CD2→CD3→…):** a mesma tela executa **qualquer** trecho `legType==='TRANSFER'`, usando o `destinationFacilityName`/`nextLegRoutingId` **do próprio trecho**. O handoff move a carga pro `nextLegRoutingId` seja ele outro trecho de transferência ou o last-mile. Multi-hop = mais trechos, mesma renderização — sem ramo especial. **Não assumir "último trecho" nem "transferência única".**

## 7. Tratamento de erros / degradação

- Comprovante incompleto (sem foto e sem assinatura) → bloqueia o envio com mensagem (espelha a validação do backend).
- Handoff falha (rede/validação) → toast, permanece na tela; nada é marcado localmente.
- Posse inválida (trecho não é do motorista) → 403 tratado com mensagem clara.
- Rota/app comum (sem `legType`) → renderização atual intacta (campos novos = `undefined`).
- Endpoint antigo `POST /custody/handoff` (admin) permanece; o driver-scoped é adicional.

## 8. Testes

- **Backend (novo endpoint):** teste do check de posse (motorista dono vs. não-dono → 403), da derivação de contexto (facilityId/serviceIds/nextLeg do trecho), e do default de `serviceIds` (corpo vazio → lote inteiro). Reusa o `custody.handoff` já testado.
- **App:** gate = **smoke manual** (a própria demo): abrir trecho de transferência → CD→CD + lote → handoff com comprovante → verificar que a carga aparece no last-mile.
- Helper puro de decisão de fluxo (`isTransferLeg(routing)` = `routing.legType === 'TRANSFER'`) — testável se extraído.

## 9. Estrutura de arquivos (unidades)

**App (`lab-app`):**
- `src/domain/agility/routing/dto/response/routing.response.ts` — + campos de malha (`legType`, `parentRoutingId`, `nextLegRoutingId`, `originFacilityName`, `destinationFacilityName`).
- `src/domain/agility/service/dto/...` — `custodyPhase?` no `ServiceResponse` (opcional).
- `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/index.tsx` — branch `legType==='TRANSFER'` → execução de transferência.
- Nova tela/estado de execução de transferência (ex.: `.../[id]/transferencia/` ou um componente sob `_components/`), reusando `SharedEtapaRecebedor`/`SignatureCanvas`/upload S3.
- `src/domain/agility/routing/routingAPI.ts` + `useCase/useRoutingHandoff.ts` — `POST /routings/:id/handoff`.

**Backend (`agility-services`):**
- `src/routing/controller/routing.controller.ts` — `@Post(':id/handoff')` (guard motorista).
- `src/routing/service/routing.service.ts` (ou um `driver-handoff` fino) — posse + derivação + chama `custody.service.handoff`.
- `src/routing/dto/driver-handoff.dto.ts` — `DriverHandoffDto` (reusa `CustodyHandoffProofDto`).

## 10. Faseamento

- **Fase A (backend):** endpoint driver-scoped `POST /routings/:id/handoff` (posse + derivação + chama custody). Pré-requisito do app.
- **Fase B (app):** ciência de trecho (types) + execução de transferência + hook de handoff.

(A Fase B depende do endpoint da Fase A. Sem backend deployado, o app não fecha o handoff — mas a UI pode ser construída/mocada em paralelo.)

## 11. Follow-ups

- Conferência por lote-palete / por pedido (seleção na lista) — aditivo, endpoint já pronto.
- Multi-hop real (cadeia de trechos de transferência) — mesma tela, sem mudança estrutural.
- Comprovante-viewer na plataforma web (P1 do mapa de subutilização).
- Carregar/conferir no CD de origem.
