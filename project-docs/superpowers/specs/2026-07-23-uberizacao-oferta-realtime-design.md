# Uberização — Oferta em tempo real (popup Uber) + raio funcional — Design

**Data:** 2026-07-23
**Repos:** agility-services (backend), agility-frontend-platform (operador), lab-app / agility-app (app do motorista)
**Status:** aprovado (brainstorming), pronto para planos

## Problema

Hoje a oferta de uberização **não aparece proativamente** para o motorista: ele só a vê se abrir a aba *Ofertas* e puxar para atualizar (`useFindBroadcastingRoutings` sem polling; `notificationRoutes.ts` sem rota de oferta; sem surfacing in-app). O backend **já dispara push** (`notification.listener.ts` cria `Notification` do tipo `ROUTE_OFFER` → Expo push), mas o app não abre a tela ao tocar e não mostra nada com o app aberto.

Além disso, o **filtro por raio de distância não é funcional** na prática: `RoutingOfferNotificationService.notifyEligibleDrivers` só filtra por distância quando `offerType === PROXIMITY` + origem + raio, mas a única categoria que faz broadcast (`public_auction`) é enviada com `offerType = ALL` (o front força isso), e a categoria PROXIMITY (`internal_auction`) tem `publicOffer = false` → nunca faz broadcast. Resultado: hoje o único gate real é o toggle "Disponível"; a oferta vai para **todos os disponíveis**, ignorando distância, e o operador não tem nem como configurar um raio.

## Objetivo

A oferta aparece ao motorista **em tempo real, estilo Uber**: popup in-app sobre qualquer tela quando o app está aberto (com som e vibração), push quando em background, e polling como rede de segurança — e **apenas para motoristas dentro do raio configurado** (proximidade real).

## Arquitetura

Duas frentes que se encaixam: **quem** recebe (Frente A — raio) e **como** o motorista vê (Frente B — popup em tempo real). Viram dois planos em sequência; B é o coração, A é menor e independente.

```
public_auction criada (com raio opcional)
        │  route.offer.available
        ▼
RoutingOfferNotificationService.notifyEligibleDrivers
   ├─ gate: driver.isAvailable()
   ├─ se PROXIMITY: distância(driverLocation, routing.origin) ≤ raio   ← Frente A
   └─ para cada elegível (keycloakUserId):
         ├─ emitRouteOfferAvailable  → push Expo (JÁ EXISTE, background)
         └─ emitOfferToDriver        → WS `offer.available` na sala user:{id}  ← Frente B (NOVO)
        ▼
App do motorista (disponível → WS /monitoring já conectado)
   ├─ WS listener `offer.available` → store de ofertas
   ├─ OfferAlertProvider → POPUP global (som+vibra, timer, Aceitar/Recusar)
   ├─ push tap → notificationRoutes rota de oferta → abre Ofertas (background)
   └─ polling fallback (refetchInterval) enquanto disponível
```

## Frente A — Raio funcional (quem recebe)

**Decisão:** raio é **por-rota**, configurado no momento da otimização (default vindo de `userSettings.defaultOffer.broadcastRadiusKm`). Distância medida de `routing.origin` → localização do motorista (o que o backend já faz).

### A1. Front operador (agility-frontend-platform)
- Em `DirectOptimizationModal`, ao lado do seletor de frete (feature já entregue no PR #286), quando `routingCategory === 'public_auction'`: campo **"Raio de oferta (km)"** opcional.
- No payload de otimização, montar o `offer`:
  - raio preenchido (`> 0`) → `offerType: 'PROXIMITY'`, `broadcastRadiusKm: <valor>`.
  - vazio → `offerType: 'ALL'` (comportamento atual, todos disponíveis).
- `offer.valueMode`/`totalValue` (frete) já são enviados; este campo se soma ao mesmo objeto `offer`.

### A2. Backend (agility-services) — verificação, sem nova lógica de distância
- `notifyEligibleDrivers` **já** implementa o filtro PROXIMITY (linhas 68-86). Só precisa **receber** `offerType=PROXIMITY` + `broadcastRadiusKm` para `public_auction`.
- **Verificar no plano:** que a rota criada por `public_auction` persiste `originLatitude/originLongitude` (senão o guard "PROXIMITY sem coordenadas → não notifica ninguém" barra tudo). Se não persistir, threadar a origem para a rota na criação.
- **Presença/localização:** o filtro usa `driverDataService.getDriverLocation(driver)`. O app já publica heartbeat quando disponível (spec 2026-07-16). Best-effort por ora: motorista com localização velha pode entrar/sair do raio incorretamente — risco documentado; ligar o cron auto-indisponível (`DRIVER_PRESENCE_AUTO_UNAVAILABLE_ENABLED`) é alavanca separada, fora desta feature.

## Frente B — Popup em tempo real (como vê)

### B1. Backend (agility-services) — emissão WS por motorista
- No `MonitoringGateway` (`/monitoring`): ao conectar, se o usuário é motorista, entrar na sala `user:{userId}` (userId = JWT sub = keycloakUserId, o mesmo id que o fluxo de oferta já resolve). Não altera as salas de tenant existentes do operador.
- Novo método `emitOfferToDriver(keycloakUserId: string, payload: OfferAvailablePayload): void` → `server.to('user:'+keycloakUserId).emit('offer.available', payload)`.
- Chamar em `RoutingOfferNotificationService.notifyEligibleDrivers`, no mesmo ponto que já chama `emitRouteOfferAvailable` (após passar por disponibilidade + filtro de raio) — assim WS e push respeitam o mesmo público.
- `OfferAvailablePayload` (enxuto, espelha o que a tela Ofertas mostra): `{ routingId, code, totalValue, distanceKm, durationMin, stopsCount, offerTime, expiresAt, originLat, originLng }`. Builder puro e testável.

### B2. App (lab-app) — popup, WS, push, polling
- **`OfferAlertProvider`** montado acima do navegador de tabs (em `(auth)/_layout` ou provider raiz autenticado): mantém um store de ofertas pendentes (fila) e renderiza um **modal global** sobre qualquer tela quando há oferta ativa.
  - Conteúdo: resumo (frete, distância, duração, nº paradas), **contador regressivo** derivado de `offerTime`/`expiresAt`, botões **Aceitar** / **Recusar**.
  - **Som + vibração** ao surgir (expo-av / expo-haptics; ativo file de som curto). Respeitar silêncio do SO/ível.
  - **Aceitar** → `POST /routings/:id/accept` (já existe) → navega para a rota; **Recusar** → dispensa local (oferta segue para outros / expira); **expira** → auto-dispensa.
  - Um por vez; ofertas extras enfileiram.
- **WS listener:** no socket `/monitoring` já conectado (LocationTrackingProvider), assinar `offer.available` → `addOffer(payload)` no store.
- **Push tap (background):** adicionar em `notificationRoutes.ts` a rota do tipo de oferta (mapear `ROUTE_OFFER`/`ofertas`) → abre a aba Ofertas (ou o detalhe via `routingId`). Também: ao receber push `ROUTE_OFFER` em foreground, encaminhar ao mesmo store (belt-and-suspenders com o WS).
- **Polling fallback:** `refetchInterval` (~20-30s, `retry` habilitado) no `useFindBroadcastingRoutings` enquanto `isAvailable`; refetch imediato no evento WS. Novas ofertas do fetch que não estão no store viram popup (mesmo dedup).
- **Gating + dedup:** popup só quando `driver.isAvailable`; dedup por `routingId` (não repopa a mesma oferta, respeita as já aceitas/recusadas nesta sessão). Se `accept` retornar **409** (oferta já pega) → toast "não está mais disponível" + dispensa.

## Fluxo de dados (feliz)

1. Operador otimiza `public_auction` com raio 15 km + frete → rota criada, `BROADCASTING`.
2. `route.offer.available` → `notifyEligibleDrivers`: para cada motorista **disponível** dentro de 15 km da origem → push (background) **e** `emitOfferToDriver` (WS).
3. App do motorista (disponível, WS conectado) recebe `offer.available` → popup aparece com som/vibra + timer.
4. Motorista toca **Aceitar** → `POST /routings/:id/accept` → entra na rota. (Ou **Recusar** → dispensa; ou expira → some.)

## Bordas / erros

- **WS caiu:** polling (20-30s) pega a oferta antes de expirar (best-effort — timers de oferta devem ser ≥ o intervalo de polling; documentar).
- **Entrega tripla (WS + push + polling):** dedup por `routingId` garante um único popup.
- **Oferta já aceita por outro:** `accept` → 409 → toast + dispensa (corrida já é resolvida pelo `atomicAcceptRouting` no backend).
- **PROXIMITY sem origem/localização:** backend já pula (não notifica) — no plano, garantir origem persistida; motorista sem localização não recebe PROXIMITY (comportamento correto).
- **Múltiplas ofertas simultâneas:** fila no store; uma por vez.
- **App em background:** só push (WS pode estar suspenso); tap abre Ofertas.

## Testes

- **Backend:** unit de `emitOfferToDriver` (emite na sala `user:{id}` certa; não vaza para tenant rooms); unit de que `notifyEligibleDrivers` chama `emitOfferToDriver` para elegíveis e **não** chama para fora do raio/indisponível; builder puro do `OfferAvailablePayload`.
- **Front operador:** `tsc --noEmit` limpo; verificação manual do payload (`offerType=PROXIMITY` + `broadcastRadiusKm` quando raio preenchido; `ALL` quando vazio). (repo tem jest sem RTL.)
- **App:** jest da lógica **pura** do store — dedup por routingId, fila, expiração pelo timer, gating por `isAvailable`, transição em 409. Popup/som/vibração e integração WS por **verificação manual** (sem RTL).

## Decomposição em planos

- **Plano A — Raio funcional:** A1 (front operador: campo raio + PROXIMITY no payload) + A2 (backend: verificar origem persistida; nenhuma lógica de distância nova). Menor, independente, entregável sozinho.
- **Plano B — Popup em tempo real:** B1 (backend: sala `user:{id}` + `emitOfferToDriver` + payload builder + ligar no fluxo) + B2 (app: OfferAlertProvider/popup, WS listener, push route, polling, som/vibra, dedup/gating). O coração.

Ordem sugerida: A primeiro (destrava a proximidade real, base do "só quem está perto"), depois B (a experiência). B funciona mesmo sem A (popup para todos disponíveis), então podem ir em paralelo se preferir.

## Fora de escopo (YAGNI)

- Endpoint de recusa / persistência em `RoutingOffer` (Recusar = dispensa local).
- Namespace WS novo (reusa `/monitoring`).
- Lance por valor / "menor valor".
- Geodistância própria (reusa `DistanceCalculatorService`).
- Ligar o cron auto-indisponível (alavanca separada; best-effort de presença por ora).
- Nomenclatura "leilão" → "uberização" nos textos (refactor separado já mapeado).

## Verificações abertas (resolver no plano)

1. `public_auction` persiste `originLatitude/Longitude` na rota? (necessário para PROXIMITY.)
2. O socket `/monitoring` do app autentica com `userId` = keycloakUserId e permite `client.join('user:'+userId)` sem quebrar as salas de tenant do operador?
3. O app mantém o WS `/monitoring` conectado sempre que disponível (o gate de tracking é `disponível || em-rota`) — confirmar que basta para receber ofertas quando disponível e ocioso.
