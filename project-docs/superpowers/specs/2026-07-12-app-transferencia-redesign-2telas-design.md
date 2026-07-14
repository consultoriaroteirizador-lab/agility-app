# App motorista — Redesign da transferência de malha (2 telas: overview + comprovante)

**Data:** 2026-07-12
**Épico:** cross-docking rede multi-trecho (malha) — app do motorista
**Repo:** `lab-app` (React Native + Expo Router) — **frontend-only, sem backend**
**Continuação de:** `2026-07-12-app-motorista-transferencia-malha-design.md` (v1). Substitui a tela `TransferLegExecution` (hoje simples demais).

---

## 1. Objetivo

Enriquecer a execução do trecho de TRANSFERÊNCIA no app, reusando os padrões já existentes do last-mile, num fluxo de **2 telas**:

- **Tela 1 (visão geral):** CD de origem e CD de destino (nome + endereço completo, com **casinha**), **mapa da rota CD1→CD2** (o mesmo que o web desenha), e a lista de pedidos do lote em cards bonitos.
- **Tela 2 (comprovante):** ao "Cheguei no CD de destino" → coleta de comprovante no padrão do last-mile (nome + documento + foto + assinatura) → handoff.

Tudo **no app** (nenhuma mudança de backend): os dados que faltavam ao app **já existem** nos endpoints atuais — o web os usa; o app só não tinha o wiring.

## 2. Contexto (o dado já existe — como o web faz)

Apurado no código:

- **CD1 (origem):** `map-data.origin` (coords + address) — o app já busca via `useGetRoutingMapData`. `RoutingResponse.originFacilityName`/`originAddress` também.
- **CD2 (destino):** a rota só guarda `destinationFacilityId` (sem coords). O **web resolve** buscando a lista de CDs (`useFindAllDistributionCenters`) e fazendo join por `destinationFacilityId` (`cdById`, `NewFlowResult.tsx:131-136,484-498`). O `destinationFacilityName` já vem; coords/endereço vêm do `DistributionCenter`.
- **Linha CD1→CD2:** o web desenha via **ORS ao vivo** (`MapaResultado.fetchRealRoute`) entre os steps; o app já tem ORS ao vivo no `StopRouteMap` (`useRouteDirections`).
- **Lacunas no APP (só wiring):** (a) `RoutingResponse` do app não tipa/consome `destinationFacilityId` (vem no fio via `findByIdFull`); (b) o app **não tem nenhum domínio de distribution-center** (`grep distribution-center` no `lab-app` = 0) — precisa de um API client + hook espelhando o web.

Componentes reusáveis (prop-driven, sem `ParadaContext`): `DocumentCollectionForm` (`{data:{recipientName,documentType,documentNumber}, onChange}`), `MultiPhotoPicker`, `SignatureCanvas`, `Map` (`points: MapPoint[]` + `geometry`/`coordinateSegments`), helper `formatAddressFull`, e o visual do `ItemCheckCard` (card com borda + título bold + meta cinza).

## 3. Escopo

**Dentro (frontend-only):**
- `destinationFacilityId?: string | null` no `RoutingResponse` do app.
- Domínio distribution-center no app: API client + `useFindAllDistributionCenters` (ou `findByIds`) → `cdById`.
- Redesign do `TransferLegExecution` em 2 passos (`overview` | `comprovante`), estado local.
- Marcador de **casinha** pro CD no mapa (variante no `StopMarker` se ainda não existir).

**Fora:**
- Backend (nenhum). Nicety futuro (não bloqueia): backend embutir CD2 `{lat,lng,address}` na resposta pra poupar o fetch de DC.
- Check de item por pedido (transferência não tem dado de item — só nome+endereço).
- Multi-hop com N CDs intermediários no mapa (hoje CD1→CD2; a mesma tela serve por trecho).

## 4. Arquitetura

### 4.1 Wiring de dado (app)
- **Tipo:** `RoutingResponse.destinationFacilityId?: string | null` (aditivo; já vem no fio).
- **Distribution-center domain** (novo, `src/domain/agility/distribution-center/`): `distributionCenterAPI` (`GET /distribution-centers` e/ou `/:id`) + `useFindAllDistributionCenters(params)` (React Query) espelhando o padrão do web. Retorna CDs com `{ id, name, latitude, longitude, address }`.
- **Resolução do CD2:** `const cdById = new Map(...)`; `const cd2 = routing.destinationFacilityId ? cdById.get(routing.destinationFacilityId) : undefined`. Fallback: se não resolver, mostra só `destinationFacilityName` sem pino/endereço.
- **CD1:** `useGetRoutingMapData(routing.id)` → `origin` (coords + address). Nome via `routing.originFacilityName`.

### 4.2 Mapa (reusa `Map`)
- `points`: 2 `MapPoint` — CD1 `{ latitude, longitude, label:'O', color: verde }` e CD2 `{ latitude, longitude, label:'D', color: primary100 }`, ambos com variante **casinha** (ícone de CD).
- Linha: ORS ao vivo entre CD1 e CD2 (reusar `useRouteDirections`/o mesmo mecanismo do `StopRouteMap`); **fallback reta** (`coordinateSegments=[[[cd1Lon,cd1Lat],[cd2Lon,cd2Lat]]]`) se ORS falhar. (Não usar `map-data.geometry` cru: por default é round-trip CD1→CD2→CD1.)
- `StopMarker`: adicionar variante `cd`/casinha (ícone de armazém) se não existir; o `Map` passa `variant` por ponto.

### 4.3 Tela 1 — visão geral (`overview`)
- Card **origem**: casinha + `originFacilityName` + endereço (`originAddress` / `formatAddressFull` quando houver objeto).
- Card **destino**: casinha + `destinationFacilityName` + endereço do CD2 (do `cdById`).
- **Mapa** CD1→CD2 (`Map` acima), altura ~200-240.
- **Lista de pedidos** do lote (`paradas`), cada um num card estilo `ItemCheckCard` (borda `gray200`, `s12`, título `nome` bold + `endereco` cinza, ícone à esquerda) — **sem** botão de check. Cabeçalho "Lote da carga ({n} pedidos)".
- CTA **"Cheguei no CD de destino"** → `setStep('comprovante')`.

### 4.4 Tela 2 — comprovante (`comprovante`)
- Recap curto: destino (nome) + "{n} pedidos".
- **`DocumentCollectionForm`** (nome + tipo de documento + número) controlado por estado local.
- **`MultiPhotoPicker`** (fotos) + **`SignatureCanvas`** (assinatura).
- Checklist visual (Documento/Foto/Assinatura) no estilo do `SharedEtapaFinalizacao` (opcional, se couber no tempo).
- CTA **"Registrar entrega da carga"** (disabled até nome + (foto **ou** assinatura)) → upload paralelo (`uploadMultipleServicePhotos`/`uploadBase64Signature`) → `useRoutingHandoff({ id, payload: { proof: { receivedBy, photoProof?, signature?, notes? } } })` → sucesso (`SuccessScreen`/view) → `router.replace('/(auth)/(tabs)')`.
- Botão voltar pra Tela 1.

### 4.5 Componente
- `TransferLegExecution.tsx` vira o host do wizard: `const [step, setStep] = useState<'overview'|'comprovante'>('overview')`, `useRota()` (routing/paradas), `useGetRoutingMapData(routing.id)`, `useFindAllDistributionCenters(...)`. Renderiza `<TransferOverviewStep .../>` ou `<TransferComprovanteStep .../>` (dois sub-componentes prop-driven, no mesmo `_components/` da rota). Estado do comprovante (receivedBy/document/photos/signature) fica no host ou no step de comprovante.

## 5. Fluxo de dados

`useRota()` → `routing` (legType TRANSFER, destinationFacilityId, originFacilityName, destinationFacilityName) + `paradas` (lote). `useGetRoutingMapData(routing.id)` → CD1 coords. `useFindAllDistributionCenters` → `cdById` → CD2 coords/endereço. Mapa desenha CD1→CD2. Comprovante → upload → `useRoutingHandoff` → `POST /routings/:id/handoff` (já existe) → custódia move a carga.

## 6. Tratamento de erros / degradação

- CD2 não resolvido (sem `destinationFacilityId`, ou DC não encontrado) → card de destino mostra só o nome; mapa mostra só o pino de CD1 (sem linha). Sem quebra.
- ORS falha → linha reta CD1→CD2.
- `map-data` sem `origin` (raro) → oculta o mapa, mantém os cards e a lista.
- Rota comum (não-TRANSFER) → inalterada (branch por `legType`).
- Comprovante incompleto → CTA desabilitado.

## 7. Testes

- Gate = **smoke manual** (a demo): abrir trecho de transferência → Tela 1 com os 2 CDs (casinhas), mapa CD1→CD2, lote → "Cheguei" → Tela 2 comprovante → handoff → carga no last-mile.
- Helper puro, se extraído (ex.: `resolveCd2(routing, cdById)`), testável.

## 8. Estrutura de arquivos (unidades)

**App (`lab-app`):**
- `src/domain/agility/routing/dto/response/routing.response.ts` — + `destinationFacilityId?`.
- `src/domain/agility/distribution-center/` (novo) — `distributionCenterAPI.ts` + `dto/response/*` + `useCase/useFindAllDistributionCenters.ts` (espelha o padrão dos outros domínios do app).
- `src/components/.../StopMarker.tsx` — variante casinha/CD (se não existir).
- `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferLegExecution.tsx` — host do wizard 2 passos.
- `.../_components/TransferOverviewStep.tsx` (novo) — cards CD + mapa + lista.
- `.../_components/TransferComprovanteStep.tsx` (novo) — DocumentCollectionForm + foto + assinatura + CTA handoff.
- Reuso: `Map`, `MapPoint`, `useRouteDirections` (linha ORS), `DocumentCollectionForm`, `MultiPhotoPicker`, `SignatureCanvas`, `formatAddressFull`, `ItemCheckCard` (visual), `useGetRoutingMapData`, `useRoutingHandoff`.

## 9. Faseamento

- **Fase 1 (wiring de dado):** `destinationFacilityId` no tipo + domínio distribution-center (API + hook). Base do mapa/destino.
- **Fase 2 (Tela 1):** `TransferOverviewStep` — cards CD (casinha) + mapa CD1→CD2 + lista de pedidos; host `TransferLegExecution` com o passo overview + CTA.
- **Fase 3 (Tela 2):** `TransferComprovanteStep` — DocumentCollectionForm + foto + assinatura + handoff (reusa `useRoutingHandoff`); wire do passo comprovante.
- (O passo comprovante já tem a lógica de handoff da v1 — é reorganizar + enriquecer o comprovante.)

## 10. Follow-ups

- Backend embutir CD2 `{lat,lng,address}` na resposta (poupa o fetch de DC no app) — nicety.
- Multi-hop: mais nós de CD no mapa quando houver cadeia.
- Backend expor a geometria **outbound-only** (CD1→CD2 sem o round-trip) — hoje o app usa ORS ao vivo, então não bloqueia.
