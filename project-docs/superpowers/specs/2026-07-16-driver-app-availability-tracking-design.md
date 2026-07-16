# App do Motorista — Disponibilidade + Tracking por Presença (Fase 2B-app) Design

**Data:** 2026-07-16
**Repo:** lab-app (React Native + Expo Router, `react-native-background-geolocation` TransistorSoft)
**Sub-projeto de:** Fase 2B (motorista disponível aparece no monitoramento + presença confiável). Backend correspondente: agility-services `feat/driver-presence-backend` (PR #349) — carimba `location_updated_at`, snapshot inclui ocioso, cron auto-indisponível atrás de flag.

## Objetivo

Fazer o motorista **disponível-ocioso reportar posição** (não só quando em rota `IN_PROGRESS`), com **disponibilidade confiável entre aberturas do app** e **heartbeat** pra manter o "ao vivo" parado. É o sub-projeto que **destrava ligar a flag** `DRIVER_PRESENCE_AUTO_UNAVAILABLE_ENABLED` do cron (sem o heartbeat, o cron derrubaria os disponíveis-parados).

## Estado atual (exploração jul/2026)

- **Gate de tracking** (`src/components/LocationTrackingProvider.tsx:49-52`): `hasInProgressRoute = routings.some(r => r.status === IN_PROGRESS)`; liga se `hasInProgressRoute`, senão desliga (gate adicional `sdkReady && driverId`). O provider **não conhece `isAvailable`**. Retorno já coberto (continua IN_PROGRESS).
- **Disponibilidade** (`src/app/(auth)/(tabs)/_rotas/hooks/useRoutesScreen.ts:12-62`, `useDriverAvailability`): estado **só local** (`useState(false)`); **empurra ativamente `isAvailable: false` pro servidor a cada abertura** (`hasInitializedRef`, `:28-38`); `onSuccess` é no-op (`:20`); toggle otimista + PATCH. UI: `AvailabilityToggle.tsx` na home (`index.tsx:110`). Hoje a disponibilidade governa **só** o leilão + abrir rota.
- **Config de localização** (`src/services/location/backgroundLocationService.ts`): `distanceFilter: 10`, `desiredAccuracy: High`, `stationaryRadius: 25`, `stopTimeout: 5`, **sem `heartbeatInterval`**, `stopOnTerminate: false`, `startOnBoot: true`. POST em `/tracking/locations`. `onHeartbeat` listener existe mas é no-op (`:451`).
- **Fetch do perfil:** `useFindOneDriver(driverId)` (`GET /drivers/{id}`, queryKey `[KEY_DRIVER, id]`) retorna `driver.isAvailable`. **Identidade:** `useAuthCredentialsService().userAuth?.driverId` (claim JWT `driver_id`).

## Design

### 1. Disponibilidade server-authoritative (fonte única: `useFindOneDriver`)

- **Remover** o force-`false`-on-launch (`useRoutesScreen.ts:28-38`). O motorista **mantém** a disponibilidade entre aberturas.
- A query `useFindOneDriver(driverId)` (cache `[KEY_DRIVER, driverId]`) vira a **fonte da verdade** de `isAvailable`. O estado exibido = `driver?.isAvailable`, com **override otimista** enquanto um toggle está pendente.
- **Toggle:** otimista (reflete imediato na UI) → PATCH `/drivers/{id}` → **invalida `[KEY_DRIVER, driverId]`** no sucesso (reflete o servidor); em erro, reverte o otimismo.
- **Por que é seguro remover o force-false AGORA:** o 2B-backend limpa fantasma (cron auto-indisponível por silêncio). Sem o backend, o force-false era a única proteção contra "disponível eterno"; com ele, o app pode confiar no valor do servidor. Ordem de deploy: **2B-app depois do 2B-backend**, e a flag do cron só liga com o 2B-app no ar.

### 2. Gate de tracking inclui disponibilidade

- `LocationTrackingProvider` passa a ler `isAvailable` da **mesma** query (`useFindOneDriver(driverId)`) e gateia **`hasInProgressRoute || isAvailable`**.
- Consequências: indisponível + sem rota → para (economiza bateria/privacidade); em rota → sempre rastreia (disponível ou não, como hoje); disponível + sem rota → **passa a rastrear** (o novo comportamento que alimenta o "solto" no monitoramento).
- O gate é reativo: alternar o toggle muda `isAvailable` na query → o effect liga/desliga o tracking sozinho.

### 3. Heartbeat + report imediato

- **`heartbeatInterval: 60`** na config. O `onHeartbeat` (hoje no-op) passa a **emitir uma posição** (`BackgroundGeolocation.getCurrentPosition({ samples: 1, persist: true })`) pra manter o "visto por último" fresco mesmo parado. Trade-off: bateria (aceito — disponível = consentimento).
- **Report imediato ao ficar disponível:** ao togglar ON, disparar um `getCurrentPosition` (além de ligar o tracking) → o motorista aparece rápido no mapa e não é varrido pelo cron por "nunca ter reportado".
- **Ressalva de plataforma (documentada, validar no device):** o `heartbeat` por tempo é confiável no **Android** (foreground service) mas **não no iOS quando o app está *terminated*** (o SO não acorda o JS por tempo). No iOS-morto-parado, aceitar stale mais cedo (a blindagem de presença do backend cobre). O SDK segue reportando nativamente **ao se mover** mesmo morto (por isso "app fechado" não é o gap).

## Interação com o 2B-backend

- O 2B-backend já aceita e expõe: a ingestão carimba `location_updated_at`; o snapshot inclui o disponível-ocioso com `available`+`lastSeenAt`. O 2B-app é quem **produz** os reportes do ocioso.
- **Só depois do 2B-app publicado** é seguro ligar `DRIVER_PRESENCE_AUTO_UNAVAILABLE_ENABLED` (o heartbeat mantém o disponível-parado vivo; sem ele, o cron derrubaria todo mundo).

## Testes (React Native)

Foco na **lógica pura testável** (padrão do repo — Jest), não na UI/SDK:
- **Predicado do gate:** `shouldTrack(hasInProgressRoute, isAvailable)` → extrair p/ função pura e testar a tabela-verdade (F,F→false; T,x→true; x,T→true).
- **Resolução do `isAvailable` exibido:** `resolveDisplayedAvailability(serverValue, pendingOptimistic)` → otimista vence enquanto pendente, senão servidor.
- SDK/heartbeat/getCurrentPosition: cobertos por review + smoke em device (não unitável de forma útil).

## Fora de escopo

- **2B-ui** (agility-frontend-platform): indicador visual solto vs em-rota / online-stale (fold-in curto, reusa frescor dos marcadores ao vivo).
- **Ligar a flag do cron** (infra-config) — ação de rollout pós-deploy do 2B-app.
- Mudança no fluxo de leilão / `RoutingOffer`.
