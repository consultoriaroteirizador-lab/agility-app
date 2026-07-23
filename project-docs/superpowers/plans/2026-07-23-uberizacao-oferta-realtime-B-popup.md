# Uberização Oferta em Tempo Real — Plano B: Popup em Tempo Real

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A oferta de uberização aparece proativamente ao motorista, estilo Uber — popup in-app (som + vibração + timer + Aceitar/Recusar) sobre qualquer tela quando o app está aberto, entregue em tempo real por WebSocket, com push em background e polling de fallback.

**Architecture:** O backend emite `offer.available` na sala `user:{keycloakUserId}` do gateway `/monitoring` (que o app já conecta quando o motorista está disponível), no mesmo ponto que já dispara o push. O app assina o evento, alimenta um store de ofertas e renderiza um popup global montado acima das tabs.

**Tech Stack:** Backend NestJS + socket.io + Jest. App React Native + Expo Router + socket.io-client + React Query. jest sem RTL → lógica pura testada; UI/som por verificação manual.

## Global Constraints

- Reusa o gateway `/monitoring` e o socket `/monitoring` já conectado no app (sem namespace novo).
- Recusar = **dispensa local** (sem endpoint de backend). Aceitar = `POST /routings/:id/accept` (já existe).
- Popup só quando `driver.isAvailable`; dedup por `routingId`; uma oferta por vez (fila).
- Payload WS espelha os campos que a tela Ofertas já lê: `{ id, offerTime, totalServices, totalDistanceKm, totalDurationMinutes, totalValue, originLat?, originLng? }`.
- `keycloakUserId` = JWT `sub` = `client.userId` no gateway; é o mesmo id que o fluxo de oferta já resolve (`driverIdCacheService.getKeycloakUserId`).
- Som/vibração: adicionar `expo-haptics` (vibração) e `expo-av` (som curto) — nenhum dos dois existe hoje; `expo-notifications ~0.32` já existe.

---

### Task B1a: Backend — sala por-usuário + `emitOfferToDriver` no MonitoringGateway

**Files:**
- Modify: `src/monitoring/gateway/monitoring.gateway.ts` (join em ~264; novo método; tipo do payload)
- Test: `src/monitoring/gateway/monitoring.gateway.spec.ts` (adicionar caso; criar se não existir)

**Interfaces:**
- Produces: `emitOfferToDriver(keycloakUserId: string, payload: OfferAvailablePayload): void` → emite `offer.available` só para `user:{keycloakUserId}`.
- `OfferAvailablePayload = { id: string; code: string; offerTime?: string; totalServices?: number; totalDistanceKm?: number; totalDurationMinutes?: number; totalValue?: number; originLat?: number; originLng?: number }`.

- [ ] **Step 1: Join da sala por-usuário** — em `handleConnection`, junto dos joins existentes (após linha 264):

```ts
        client.join(`tenant:${tenantId}:__all__`);
        client.join(this.roomFor(tenantId, branchId, ''));
        if (client.userId) {
            client.join(`user:${client.userId}`);
        }
```

- [ ] **Step 2: Tipo do payload + método** — adicionar perto de `emitScoped` (~405):

```ts
export interface OfferAvailablePayload {
    id: string;
    code: string;
    offerTime?: string;
    totalServices?: number;
    totalDistanceKm?: number;
    totalDurationMinutes?: number;
    totalValue?: number;
    originLat?: number;
    originLng?: number;
}
```
E o método na classe do gateway:
```ts
    emitOfferToDriver(keycloakUserId: string, payload: OfferAvailablePayload): void {
        this.server.to(`user:${keycloakUserId}`).emit('offer.available', payload);
    }
```

- [ ] **Step 3: Teste** (mockar `this.server.to().emit`):

```ts
it('emitOfferToDriver emite offer.available só na sala user:{id}', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    (gateway as any).server = { to };
    gateway.emitOfferToDriver('kc-123', { id: 'r1', code: 'RT-1', totalValue: 100 });
    expect(to).toHaveBeenCalledWith('user:kc-123');
    expect(emit).toHaveBeenCalledWith('offer.available', expect.objectContaining({ id: 'r1' }));
});
```

- [ ] **Step 4:** `npx jest --testPathPatterns "monitoring.gateway"` → PASS; `npx tsc --noEmit` limpo.

- [ ] **Step 5: Commit**

```bash
git add src/monitoring/gateway/monitoring.gateway.ts src/monitoring/gateway/monitoring.gateway.spec.ts
git commit -m "feat(monitoring): sala user:{id} + emitOfferToDriver (WS de oferta por motorista)"
```

---

### Task B1b: Backend — emitir a oferta por WS no fluxo de notificação

**Files:**
- Modify: `src/routing/service/routing-offer-notification.service.ts` (injetar gateway; construir payload; chamar após resolver keycloakUserId, ~95)
- Test: `src/routing/service/routing-offer-notification.service.spec.ts`

**Interfaces:**
- Consumes: `MonitoringGateway.emitOfferToDriver` (B1a); `RoutingEntity` getters (`totalValue/offerTime/totalServices/totalDistanceKm/totalDurationMinutes/originLatitude/originLongitude/code/id`).

- [ ] **Step 1: Injetar o gateway.** MonitoringModule é importado por routing.module com `forwardRef`, então:

```ts
import { forwardRef, Inject } from '@nestjs/common';
import { MonitoringGateway } from 'src/monitoring/gateway/monitoring.gateway';
// no constructor:
        @Inject(forwardRef(() => MonitoringGateway))
        private readonly monitoringGateway: MonitoringGateway,
```

- [ ] **Step 2: Builder puro do payload** — função exportada testável:

```ts
export function buildOfferPayload(routing: RoutingEntity) {
    return {
        id: routing.id()!,
        code: routing.code(),
        offerTime: routing.offerTime(),
        totalServices: routing.totalServices(),
        totalDistanceKm: routing.totalDistanceKm()?.toNumber(),
        totalDurationMinutes: routing.totalDurationMinutes(),
        totalValue: routing.totalValue()?.toNumber(),
        originLat: routing.originLatitude()?.toNumber(),
        originLng: routing.originLongitude()?.toNumber(),
    };
}
```

- [ ] **Step 3: Chamar no loop** — logo após o `emitRouteOfferAvailable(...)` existente (~100), dentro do `if (keycloakUserId)`:

```ts
                if (keycloakUserId) {
                    this.routingNotificationService.emitRouteOfferAvailable(companyId, keycloakUserId, routing.id()!, routing.code());
                    this.monitoringGateway.emitOfferToDriver(keycloakUserId, buildOfferPayload(routing));
                    notifiedCount++;
                }
```

- [ ] **Step 4: Teste** — estender o spec de A2: mockar `monitoringGateway.emitOfferToDriver` e assertar que é chamado para cada motorista elegível com o payload do builder (e NÃO para fora do raio/indisponível). Testar `buildOfferPayload` isolado com um routing mock (valores esperados).

- [ ] **Step 5:** `npx jest --testPathPatterns "routing-offer-notification"` → PASS; `npx tsc --noEmit` limpo.

- [ ] **Step 6: Commit**

```bash
git add src/routing/service/routing-offer-notification.service.ts src/routing/service/routing-offer-notification.service.spec.ts
git commit -m "feat(offer): emite offer.available por WS aos motoristas elegíveis (paralelo ao push)"
```

---

### Task B2a: App — listener `offer.available` no useTrackingWebSocket

**Files:**
- Modify: `src/domain/agility/tracking/useCase/useTrackingWebSocket.ts` (options ~18-27; listeners ~147-163)

**Interfaces:**
- Produces: `TrackingWebSocketOptions.onOfferAvailable?: (offer: OfferPayload) => void`; o socket chama isso ao receber `offer.available`.
- `OfferPayload` (app): `{ id: string; code?: string; offerTime?: string; totalServices?: number; totalDistanceKm?: number; totalDurationMinutes?: number; totalValue?: number; originLat?: number; originLng?: number }`.

- [ ] **Step 1: Tipo + option.** Adicionar `OfferPayload` (novo arquivo `src/domain/agility/routing/dto/offerPayload.ts` ou no próprio hook) e `onOfferAvailable?` em `TrackingWebSocketOptions`.

- [ ] **Step 2: Listener.** Junto dos `.on(...)` existentes (~147-163):

```ts
        socket.on('offer.available', (offer: OfferPayload) => {
            options.onOfferAvailable?.(offer);
        });
```

- [ ] **Step 3:** `npx tsc --noEmit` limpo.

- [ ] **Step 4: Commit**

```bash
git add src/domain/agility/tracking/useCase/useTrackingWebSocket.ts src/domain/agility/routing/dto/offerPayload.ts
git commit -m "feat(app): listener offer.available no socket /monitoring"
```

---

### Task B2b: App — store de ofertas (lógica pura testável)

**Files:**
- Create: `src/domain/agility/offer/offerStore.ts` (reducer/helpers puros)
- Test: `src/domain/agility/offer/offerStore.test.ts`

**Interfaces:**
- Produces: funções puras — `addOffer(list, offer, now)`, `dropOffer(list, id)`, `pruneExpired(list, now)`, `expiresAtOf(offer)`, e o seletor `activeOffer(list)`.
- `PendingOffer = OfferPayload & { receivedAt: number }`.

- [ ] **Step 1: Testes (TDD)** — `offerStore.test.ts`:

```ts
import { addOffer, dropOffer, pruneExpired, activeOffer } from './offerStore';
const o = (id: string, offerTime = '00:10') => ({ id, offerTime });

it('dedup por id ao adicionar', () => {
    let l = addOffer([], o('r1'), 0);
    l = addOffer(l, o('r1'), 5); // mesmo id
    expect(l.length).toBe(1);
});
it('enfileira ofertas distintas em ordem', () => {
    let l = addOffer([], o('r1'), 0);
    l = addOffer(l, o('r2'), 1);
    expect(activeOffer(l)?.id).toBe('r1'); // primeira da fila
});
it('dropOffer remove por id', () => {
    let l = addOffer([], o('r1'), 0);
    l = dropOffer(l, 'r1');
    expect(l.length).toBe(0);
});
it('pruneExpired remove ofertas cujo timer passou', () => {
    // offerTime '00:00' + receivedAt 0 → expira em receivedAt + 0*60s... usar offerTime em segundos via helper
    let l = addOffer([], { id: 'r1', offerTime: '00:00' }, 0);
    l = pruneExpired(l, 61_000); // 61s depois
    expect(l.length).toBe(0);
});
```

- [ ] **Step 2: Implementar** `offerStore.ts` (reaproveitar a lógica de `calcularTempoExpirar` da tela Ofertas para `expiresAtOf`):

```ts
export type OfferPayload = { id: string; code?: string; offerTime?: string; totalServices?: number; totalDistanceKm?: number; totalDurationMinutes?: number; totalValue?: number; originLat?: number; originLng?: number };
export type PendingOffer = OfferPayload & { receivedAt: number };

// offerTime "HH:mm" = duração (min:seg) da oferta; expira em receivedAt + dur.
export function expiresAtOf(o: PendingOffer): number {
    const [m, s] = (o.offerTime ?? '00:00').split(':').map(Number);
    const durMs = ((m || 0) * 60 + (s || 0)) * 1000;
    return o.receivedAt + durMs;
}
export function addOffer(list: PendingOffer[], offer: OfferPayload, now: number): PendingOffer[] {
    if (list.some((x) => x.id === offer.id)) return list;
    return [...list, { ...offer, receivedAt: now }];
}
export function dropOffer(list: PendingOffer[], id: string): PendingOffer[] {
    return list.filter((x) => x.id !== id);
}
export function pruneExpired(list: PendingOffer[], now: number): PendingOffer[] {
    return list.filter((x) => expiresAtOf(x) > now);
}
export function activeOffer(list: PendingOffer[]): PendingOffer | undefined {
    return list[0];
}
```

- [ ] **Step 3:** `npx jest offerStore` → PASS; `npx tsc --noEmit` limpo.

- [ ] **Step 4: Commit**

```bash
git add src/domain/agility/offer/offerStore.ts src/domain/agility/offer/offerStore.test.ts
git commit -m "feat(app): store puro de ofertas (dedup/fila/expiração)"
```

---

### Task B2c: App — OfferAlertProvider (popup global) + montagem + wiring

**Files:**
- Create: `src/services/offer/OfferAlertProvider.tsx`
- Modify: `src/app/(auth)/_layout.tsx` (montar o provider dentro de `LocationTrackingProvider`)
- Modify: `src/components/LocationTrackingProvider.tsx` (passar `onOfferAvailable` ao `useTrackingWebSocket`) OU consumir o WS diretamente no provider — ver Step 2.

**Interfaces:**
- Consumes: `offerStore` (B2b), `useAcceptRouting` (existente), `useFindOneDriver`/`isAvailable` (existente), `onOfferAvailable` (B2a).
- Produces: contexto que recebe ofertas (`pushOffer(offer)`) e renderiza o modal ativo.

- [ ] **Step 1: Provider + modal.** `OfferAlertProvider.tsx` mantém `PendingOffer[]` via `offerStore`, um `setInterval` de 1s para `pruneExpired` + atualizar o contador, e renderiza o `activeOffer` num `<Modal transparent visible>`:

```tsx
export function OfferAlertProvider({ children }: { children: React.ReactNode }) {
    const [offers, setOffers] = useState<PendingOffer[]>([]);
    const { userAuth } = useAuthCredentialsService();
    const driverId = userAuth?.driverId;
    const { data: driver } = useFindOneDriver(driverId);
    const isAvailable = !!driver?.isAvailable;
    const { acceptRoutingAsync, isLoading } = useAcceptRouting();

    const pushOffer = useCallback((o: OfferPayload) => {
        if (!isAvailable) return;            // gating
        setOffers((l) => addOffer(l, o, Date.now()));
    }, [isAvailable]);

    // tick p/ expiração + re-render do contador
    useEffect(() => {
        const t = setInterval(() => setOffers((l) => pruneExpired(l, Date.now())), 1000);
        return () => clearInterval(t);
    }, []);

    const current = activeOffer(offers);
    const onAceitar = async () => {
        if (!current) return;
        try {
            await acceptRoutingAsync({ id: current.id, /* driverLat/Lng via useUserLocation */ } as any);
            setOffers((l) => dropOffer(l, current.id));
            router.navigate('/(auth)/(tabs)/_rotas' as any);
        } catch (e: any) {
            // 409 = já pega
            setOffers((l) => dropOffer(l, current.id));
            // toast "não está mais disponível"
        }
    };
    const onRecusar = () => current && setOffers((l) => dropOffer(l, current.id));

    return (
        <OfferAlertContext.Provider value={{ pushOffer }}>
            {children}
            <Modal transparent animationType="slide" visible={!!current} onRequestClose={onRecusar}>
                {/* card: preço (Frete), distância, tempo, nº paradas, contador regressivo; botões Aceitar/Recusar */}
            </Modal>
        </OfferAlertContext.Provider>
    );
}
export const useOfferAlert = () => useContext(OfferAlertContext);
```

Reusar os formatadores da tela Ofertas (`formatarPreco/formatarDistancia/formatarTempo`) — extrair para `src/domain/agility/offer/format.ts` se necessário para reuso (senão duplicar mínimo).

- [ ] **Step 2: Wiring WS → pushOffer.** `LocationTrackingProvider` já usa `useTrackingWebSocket`. Adicionar `onOfferAvailable: (o) => offerAlert.pushOffer(o)`. Como o `OfferAlertProvider` deve envolver quem dispara o push, montar assim em `(auth)/_layout.tsx`:

```tsx
<OfferAlertProvider>
  <LocationTrackingProvider>   {/* passa onOfferAvailable via useOfferAlert() dentro dele */}
    <ChatProvider>
      <Stack ... />
```
Dentro de `LocationTrackingProvider`, ler `const { pushOffer } = useOfferAlert()` e passar `onOfferAvailable: pushOffer` ao `useTrackingWebSocket`.

- [ ] **Step 3: Wiring push foreground → pushOffer** (belt-and-suspenders): em `NotificationContext` (received handler ~424-435), se a notificação for de oferta (metadata com `routingId`), chamar `pushOffer` com um offer mínimo `{ id: routingId }` — que o polling/refetch completa com os dados. (Opcional; o WS é o caminho primário.)

- [ ] **Step 4: Verificar** `npx tsc --noEmit` limpo. Manual: com WS mockado/dev, emitir `offer.available` → popup aparece; Aceitar navega; Recusar fecha; expira sozinho.

- [ ] **Step 5: Commit**

```bash
git add src/services/offer/OfferAlertProvider.tsx "src/app/(auth)/_layout.tsx" src/components/LocationTrackingProvider.tsx
git commit -m "feat(app): OfferAlertProvider (popup global de oferta) + wiring WS"
```

---

### Task B2d: App — rota de oferta no notificationRoutes (push tap)

**Files:**
- Modify: `src/services/notification/notificationRoutes.ts`

- [ ] **Step 1:** Adicionar a rota de oferta ao mapa (abre a aba Ofertas; com `id`, o detalhe):

```ts
    ofertas: (params?: any) => params?.id
        ? router.navigate({ pathname: '/(auth)/(tabs)/ofertas/[id]' as any, params })
        : router.navigate('/(auth)/(tabs)/ofertas' as any),
```

- [ ] **Step 2:** Garantir que o push de oferta navegue para cá. O backend hoje seta `linkUrl: /inicio-app/ofertas/${routingId}` (web). No app, o `handleNotificationNavigation` usa `data.route || data.screen`. Se o push não trouxer `route: 'ofertas'`, mapear por tipo: no `handleNotificationNavigation`, se `data.type === 'ROUTE_OFFER'` (ou `linkUrl` contém `ofertas`), forçar `targetRoute = 'ofertas'` e `params = { id: data.routingId ?? data.metadata?.routingId }`. (Se preferir, um pequeno ajuste no backend para incluir `data.route='ofertas'` no push — fora do escopo do app; documentar.)

- [ ] **Step 3:** `npx tsc --noEmit` limpo. Manual: tocar num push de oferta (background) abre a aba Ofertas.

- [ ] **Step 4: Commit**

```bash
git add src/services/notification/notificationRoutes.ts src/services/notification/NotificationContext.tsx
git commit -m "feat(app): push de oferta abre a aba Ofertas (notificationRoutes)"
```

---

### Task B2e: App — polling de fallback no broadcasting

**Files:**
- Modify: `src/domain/agility/routing/useCase/useFindBroadcastingRoutings.ts`

- [ ] **Step 1:** Habilitar polling enquanto disponível. Aceitar um flag `enabled`/`isAvailable` e configurar `refetchInterval`:

```ts
export function useFindBroadcastingRoutings(params?: {...}, opts?: { pollWhileAvailable?: boolean }) {
    return useQuery({
        queryKey: [KEY_ROUTINGS, 'broadcasting', params?.driverLatitude, params?.driverLongitude],
        queryFn: () => routingService.findBroadcasting(params),
        retry: 1,
        refetchInterval: opts?.pollWhileAvailable ? 25_000 : false,
    })
}
```
Passar `pollWhileAvailable: isAvailable` onde o hook é usado (tela Ofertas e/ou o provider). Novas ofertas retornadas que não estejam no store → `pushOffer` (mesmo dedup por id).

- [ ] **Step 2:** `npx tsc --noEmit` limpo.

- [ ] **Step 3: Commit**

```bash
git add src/domain/agility/routing/useCase/useFindBroadcastingRoutings.ts
git commit -m "feat(app): polling de fallback (25s) no broadcasting enquanto disponível"
```

---

### Task B2f: App — som + vibração no popup

**Files:**
- Modify: `package.json` (deps `expo-haptics`, `expo-av`); `src/services/offer/OfferAlertProvider.tsx`
- Add: um asset de som curto em `assets/sounds/offer.mp3` (ou reutilizar um som existente)

- [ ] **Step 1: Deps.** `npx expo install expo-haptics expo-av` (usa versões compatíveis com o SDK). Confirmar no `package.json`.

- [ ] **Step 2: Disparar ao surgir a oferta ativa.** No `OfferAlertProvider`, quando `current?.id` muda para uma nova oferta:

```tsx
    useEffect(() => {
        if (!current) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        (async () => {
            try {
                const { sound } = await Audio.Sound.createAsync(require('@/assets/sounds/offer.mp3'));
                await sound.playAsync();
            } catch {}
        })();
    }, [current?.id]);
```

- [ ] **Step 3: Verificar** build/typecheck (`npx tsc --noEmit`). Manual em device: nova oferta toca som + vibra.

- [ ] **Step 4: Commit**

```bash
git add package.json src/services/offer/OfferAlertProvider.tsx assets/sounds/offer.mp3
git commit -m "feat(app): som + vibração ao chegar oferta"
```

---

## Self-Review

- **Cobertura da spec:** WS emit (B1a/B1b), listener (B2a), store+dedup/fila/expiração (B2b), popup+gating+accept/recusa/409 (B2c), push tap (B2d), polling fallback (B2e), som/vibra (B2f). ✔
- **Placeholders:** código real em cada passo; os comentários `{/* card ... */}` no B2c são o layout do modal a preencher com os componentes Box/Text/Button do app (mesmos da tela Ofertas) — detalhar na task, não é TBD lógico. ✔
- **Consistência de tipos:** `OfferPayload`/`PendingOffer` idênticos entre B2a/B2b/B2c; `emitOfferToDriver(keycloakUserId, payload)` idêntico entre B1a/B1b. ✔
- **Riscos/verificações:** (1) o push do backend precisa levar o app à rota `ofertas` — B2d cobre mapeando por tipo, com nota de um ajuste opcional no backend; (2) som exige asset — B2f; (3) presença: gating por `isAvailable` (a localização fresca é tratada no Plano A / heartbeat existente).
