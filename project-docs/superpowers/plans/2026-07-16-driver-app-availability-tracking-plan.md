# App do Motorista — Disponibilidade + Tracking por Presença (Fase 2B-app) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O motorista disponível-ocioso passa a reportar posição (não só em rota), com disponibilidade server-authoritative (persiste entre aberturas) e heartbeat pra manter o "ao vivo" parado.

**Architecture:** Quatro mudanças: (1) lógica pura testável (`shouldTrack` + `resolveDisplayedAvailability`); (2) `useDriverAvailability` lê `isAvailable` do servidor via `useFindOneDriver` (remove o force-false-on-launch); (3) `backgroundLocationService` ganha `heartbeatInterval`+`preventSuspend` (top-level flat) + `onHeartbeat` emite posição + export `requestCurrentPosition`; (4) `LocationTrackingProvider` gateia por `shouldTrack(hasInProgressRoute, isAvailable)` + report imediato ao iniciar.

**Tech Stack:** React Native + Expo Router, `@tanstack/react-query`, `react-native-background-geolocation` (TransistorSoft, config FLAT), Jest (jest-expo).

## Global Constraints

- **`heartbeatInterval` e `preventSuspend` são chaves TOP-LEVEL FLAT** do config do SDK (`ready({ heartbeatInterval: 60, preventSuspend: true })`) — confirmado nos docs oficiais (TransistorSoft). Colocar como irmãs de `reset`/`locationAuthorizationRequest`/`extras`, **NÃO** aninhadas em `geolocation`/`app` (o SDK lê config flat; as chaves aninhadas do arquivo são um agrupamento não-padrão passado via `as any`).
- **iOS exige `preventSuspend: true`** pro `onHeartbeat` disparar; **Android mín. 60s** (impossível mais rápido). Por isso `heartbeatInterval: 60`.
- **Fonte da verdade de `isAvailable`** = query `useFindOneDriver(driverId)` (cache `[KEY_DRIVER, driverId]`). O toggle faz otimista + PATCH + invalida essa query.
- **Gate de tracking** = `shouldTrack(hasInProgressRoute, isAvailable)` = `hasInProgressRoute || isAvailable`.
- **Remover** o force-`false`-on-launch (`useRoutesScreen.ts:28-38`) — seguro porque o 2B-backend (cron auto-indisponível) limpa fantasma.
- Indentação: 4 espaços (padrão dos arquivos tocados).

---

### Task 1: Lógica pura — `shouldTrack` + `resolveDisplayedAvailability`

**Files:**
- Create: `src/services/location/trackingGate.ts`
- Test: `src/services/location/__tests__/trackingGate.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `shouldTrack(hasInProgressRoute: boolean, isAvailable: boolean): boolean` — `true` se em rota OU disponível.
  - `resolveDisplayedAvailability(serverValue: boolean, pending: boolean | null): boolean` — `pending` quando há toggle pendente, senão `serverValue`.

- [ ] **Step 1: Escrever o teste que falha**

Create `src/services/location/__tests__/trackingGate.test.ts`:

```typescript
import { shouldTrack, resolveDisplayedAvailability } from '../trackingGate';

describe('shouldTrack', () => {
    it('liga se em rota OU disponível; desliga só quando ambos falsos', () => {
        expect(shouldTrack(false, false)).toBe(false);
        expect(shouldTrack(true, false)).toBe(true);
        expect(shouldTrack(false, true)).toBe(true);
        expect(shouldTrack(true, true)).toBe(true);
    });
});

describe('resolveDisplayedAvailability', () => {
    it('mostra o valor pendente (otimista) enquanto há toggle em voo', () => {
        expect(resolveDisplayedAvailability(false, true)).toBe(true);
        expect(resolveDisplayedAvailability(true, false)).toBe(false);
    });
    it('mostra o valor do servidor quando não há pendência', () => {
        expect(resolveDisplayedAvailability(true, null)).toBe(true);
        expect(resolveDisplayedAvailability(false, null)).toBe(false);
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/services/location/__tests__/trackingGate.test.ts`
Expected: FAIL — "Cannot find module '../trackingGate'".

- [ ] **Step 3: Implementar**

Create `src/services/location/trackingGate.ts`:

```typescript
/** Rastreamento liga quando o motorista está em rota ativa OU disponível (ocioso). */
export function shouldTrack(hasInProgressRoute: boolean, isAvailable: boolean): boolean {
    return hasInProgressRoute || isAvailable;
}

/**
 * Valor de disponibilidade a exibir: enquanto um toggle está pendente (otimista),
 * mostra o valor pedido; caso contrário, o valor autoritativo do servidor.
 */
export function resolveDisplayedAvailability(serverValue: boolean, pending: boolean | null): boolean {
    return pending !== null ? pending : serverValue;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/services/location/__tests__/trackingGate.test.ts`
Expected: PASS (2 suites, 4 asserts).

- [ ] **Step 5: Commit**

```bash
git add src/services/location/trackingGate.ts src/services/location/__tests__/trackingGate.test.ts
git commit -m "feat(tracking): lógica pura shouldTrack + resolveDisplayedAvailability"
```

---

### Task 2: `useDriverAvailability` server-authoritative

**Files:**
- Modify: `src/app/(auth)/(tabs)/_rotas/hooks/useRoutesScreen.ts` (função `useDriverAvailability`, ~L12-62)

**Interfaces:**
- Consumes: `resolveDisplayedAvailability` (Task 1); `useFindOneDriver` de `@/domain/agility/driver/useCase`; `useQueryClient` de `@tanstack/react-query`; `KEY_DRIVER` de `@/domain/queryKeys`.
- Produces: `useDriverAvailability()` retorna `{ driverId, isAvailable, isUpdatingAvailability, toggleAvailability }` (mesma superfície, **menos `setIsAvailable`** — que não é consumido por ninguém; confirmado).

- [ ] **Step 1: Ajustar imports**

No topo de `useRoutesScreen.ts`:
- Adicionar `import { useQueryClient } from '@tanstack/react-query';`
- Adicionar `import { KEY_DRIVER } from '@/domain/queryKeys';`
- Adicionar `import { resolveDisplayedAvailability } from '@/services/location/trackingGate';`
- Ajustar a linha existente `import { useUpdateDriver } from '@/domain/agility/driver/useCase';` para incluir `useFindOneDriver`: `import { useFindOneDriver, useUpdateDriver } from '@/domain/agility/driver/useCase';`

(Este arquivo usa só `resolveDisplayedAvailability` do `trackingGate` — NÃO importar `shouldTrack` aqui.)

- [ ] **Step 2: Reescrever `useDriverAvailability`**

Trocar toda a função `useDriverAvailability` (L12-62) por:

```typescript
function useDriverAvailability() {
    const { userAuth } = useAuthCredentialsService();
    const driverId = userAuth?.driverId || null;
    const queryClient = useQueryClient();

    // Fonte da verdade: o servidor. Persiste a disponibilidade entre aberturas.
    const { driver } = useFindOneDriver(driverId);
    const serverAvailable = driver?.isAvailable ?? false;

    // Valor pedido enquanto o PATCH está em voo (otimismo). null = sem pendência.
    const [pendingValue, setPendingValue] = useState<boolean | null>(null);
    const isAvailable = resolveDisplayedAvailability(serverAvailable, pendingValue);

    const { updateDriver, isLoading: isUpdatingAvailability } = useUpdateDriver({
        onSuccess: () => {
            if (driverId) {
                queryClient.invalidateQueries({ queryKey: [KEY_DRIVER, driverId] });
            }
        },
        onError: (error) => {
            setPendingValue(null); // reverte pro valor do servidor
            console.error('[useDriverAvailability] Error updating availability:', error);
        },
    });

    // Limpa o otimismo quando o servidor já reflete o valor pedido (sem flicker).
    useEffect(() => {
        if (pendingValue !== null && serverAvailable === pendingValue) {
            setPendingValue(null);
        }
    }, [serverAvailable, pendingValue]);

    const toggleAvailability = useCallback(
        async (newValue: boolean) => {
            if (!driverId || isUpdatingAvailability) return false;

            setPendingValue(newValue); // otimista
            updateDriver({
                id: driverId,
                payload: { isAvailable: newValue },
            });

            return true;
        },
        [driverId, isUpdatingAvailability, updateDriver]
    );

    return {
        driverId,
        isAvailable,
        isUpdatingAvailability,
        toggleAvailability,
    };
}
```

Isso **remove** o `hasInitializedRef`/force-false useEffect e o export de `setIsAvailable`. Manter `useState`, `useEffect`, `useCallback`, `useRef` importados só se ainda usados no arquivo (o `useRef` pode ficar órfão — remover do import se o lint acusar).

- [ ] **Step 3: Verificar consumidores + type-check**

Confirmar que nada usa `setIsAvailable` do retorno (grep já feito: só `index.tsx` usa `isUpdatingAvailability`/`toggleAvailability`/`isAvailable`). Se `useRoutesScreen` re-exporta `setIsAvailable` mais abaixo, remover essa linha.

Run: `npx tsc --noEmit`
Expected: sem novos erros. (Se acusar `useRef`/`useState` não usado, ajustar os imports do topo.)

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/(tabs)/_rotas/hooks/useRoutesScreen.ts"
git commit -m "feat(tracking): disponibilidade server-authoritative (useFindOneDriver + otimismo), remove force-false-on-launch"
```

---

### Task 3: Heartbeat + `requestCurrentPosition` no `backgroundLocationService`

**Files:**
- Modify: `src/services/location/backgroundLocationService.ts` (config `getDefaultConfig` ~L141-222; `onHeartbeatHandler` ~L451-458; adicionar export novo)

**Interfaces:**
- Consumes: nada novo.
- Produces: `requestCurrentPosition(): Promise<void>` — força um `getCurrentPosition` (persiste + POSTa), pra report imediato. Consumido pelo provider (Task 4).

- [ ] **Step 1: Adicionar `heartbeatInterval` + `preventSuspend` (top-level flat)**

No objeto retornado por `getDefaultConfig` (~L164-177), adicionar duas chaves TOP-LEVEL (irmãs de `reset`/`locationAuthorizationRequest`, fora de qualquer namespace). Logo após a linha `reset: true,`:

```typescript
  // Heartbeat: mantém o "visto por último" fresco quando o motorista está
  // disponível e parado. Top-level (config flat do SDK). iOS exige
  // preventSuspend:true pro onHeartbeat disparar; Android mínimo 60s.
  heartbeatInterval: 60,
  preventSuspend: true,
```

- [ ] **Step 2: `onHeartbeatHandler` emite posição**

Trocar o corpo de `onHeartbeatHandler` (~L451-458) por:

```typescript
function onHeartbeatHandler(event: HeartbeatEvent) {
  console.log('[BGGeolocation] onHeartbeat:', {
    location: event.location ? {
      lat: event.location.coords.latitude.toFixed(6),
      lng: event.location.coords.longitude.toFixed(6),
    } : null,
  });

  // O heartbeat NÃO engaja o GPS sozinho (event.location é só o último conhecido).
  // Forçamos uma posição fresca — que persiste + POSTa pro backend, mantendo o
  // "ao vivo" mesmo parado.
  BackgroundGeolocation.getCurrentPosition({ samples: 1, persist: true }).catch((err) => {
    console.warn('[BGGeolocation] onHeartbeat getCurrentPosition falhou:', err);
  });
}
```

- [ ] **Step 3: Exportar `requestCurrentPosition`**

Adicionar (perto das outras funções exportadas, ex.: após `initializeBackgroundGeolocation` ou junto de `startTracking`/`stopTracking` — procurar onde essas moram):

```typescript
/**
 * Força uma leitura de posição imediata (persiste + POSTa). Usado no report
 * imediato ao ficar disponível, pra o motorista aparecer rápido no mapa.
 */
export async function requestCurrentPosition(): Promise<void> {
  try {
    await BackgroundGeolocation.getCurrentPosition({ samples: 1, persist: true });
  } catch (err) {
    console.warn('[BGGeolocation] requestCurrentPosition falhou:', err);
  }
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: sem novos erros. Se o tipo `Config` não aceitar `heartbeatInterval`/`preventSuspend` (o config já é passado via `as any` no `ready()`), não haverá erro; se houver, confirmar que as chaves ficam no objeto passado ao `ready(config as any)`.

Run: `npx jest src/services/location/__tests__/trackingGate.test.ts`
Expected: PASS (Task 1 segue verde).

- [ ] **Step 5: Commit**

```bash
git add src/services/location/backgroundLocationService.ts
git commit -m "feat(tracking): heartbeatInterval 60s + preventSuspend + onHeartbeat emite posição + requestCurrentPosition"
```

---

### Task 4: Gate do `LocationTrackingProvider` inclui disponibilidade + report imediato

**Files:**
- Modify: `src/components/LocationTrackingProvider.tsx` (imports; effect de gate ~L119-133)

**Interfaces:**
- Consumes: `shouldTrack` + `requestCurrentPosition` (Tasks 1, 3); `useFindOneDriver` (`@/domain/agility/driver/useCase`).
- Produces: nada (efeito de tracking).

- [ ] **Step 1: Imports**

Adicionar:

```typescript
import { useFindOneDriver } from '@/domain/agility/driver/useCase';
import { shouldTrack } from '@/services/location/trackingGate';
import { requestCurrentPosition } from '@/services/location/backgroundLocationService';
```

(Se `backgroundLocationService` já é importado no arquivo, só adicionar `requestCurrentPosition` à lista existente.)

- [ ] **Step 2: Ler `isAvailable` da mesma query e computar o gate**

Logo após o bloco de `hasInProgressRoute` (~L49-52), adicionar:

```typescript
  // Disponibilidade vem da MESMA fonte da verdade que a home (cache do React
  // Query). Motorista disponível-ocioso também é rastreado (alimenta o "solto"
  // no monitoramento).
  const { driver } = useFindOneDriver(userAuth?.driverId ?? null);
  const isAvailable = driver?.isAvailable ?? false;
  const trackingEnabled = shouldTrack(hasInProgressRoute, isAvailable);
```

- [ ] **Step 3: Trocar o effect de gate (L119-133)**

Trocar:

```typescript
  useEffect(() => {
    if (!sdkReady || !driverId) return;

    if (hasInProgressRoute) {
      console.log('[LocationTrackingProvider] Rota IN_PROGRESS — iniciando tracking');
      startTracking().catch(err => {
        console.error('[LocationTrackingProvider] Erro ao iniciar tracking:', err);
      });
    } else {
      console.log('[LocationTrackingProvider] Sem rota IN_PROGRESS — parando tracking');
      stopTracking().catch(err => {
        console.error('[LocationTrackingProvider] Erro ao parar tracking:', err);
      });
    }
  }, [sdkReady, driverId, hasInProgressRoute, startTracking, stopTracking]);
```

por:

```typescript
  useEffect(() => {
    if (!sdkReady || !driverId) return;

    if (trackingEnabled) {
      console.log('[LocationTrackingProvider] Em rota ou disponível — iniciando tracking');
      startTracking()
        .then(() => {
          // Report imediato: aparece rápido no mapa e não é varrido pelo cron
          // por "nunca ter reportado".
          void requestCurrentPosition();
        })
        .catch(err => {
          console.error('[LocationTrackingProvider] Erro ao iniciar tracking:', err);
        });
    } else {
      console.log('[LocationTrackingProvider] Sem rota e indisponível — parando tracking');
      stopTracking().catch(err => {
        console.error('[LocationTrackingProvider] Erro ao parar tracking:', err);
      });
    }
  }, [sdkReady, driverId, trackingEnabled, startTracking, stopTracking]);
```

Nota: `startTracking`/`stopTracking` são idempotentes (checam o estado real do SDK), então re-renders/flips não causam start→stop→start nem duplicam o `requestCurrentPosition` de forma nociva (o `then` só roda quando `trackingEnabled` vira true e o effect re-dispara).

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: sem novos erros.

Run: `npx jest src/services/location/__tests__/trackingGate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LocationTrackingProvider.tsx
git commit -m "feat(tracking): gate por presença (shouldTrack: rota OU disponível) + report imediato ao iniciar"
```

---

## Notas de execução

- **Ordem:** Task 1 → 2 → 3 → 4 (2 usa `resolveDisplayedAvailability`; 4 usa `shouldTrack` + `requestCurrentPosition`).
- **Testabilidade:** só a lógica pura (Task 1) é unitável de forma útil. Tasks 2-4 (hooks/SDK/provider) são validadas por `tsc` + review + **smoke em device** — não há ganho real em testar hook/SDK com mocks pesados neste app (o repo não tem esse padrão).
- **Smoke em device (pós-merge, manual):**
  1. Toggle "Disponível" ON sem rota → o motorista começa a reportar; aparece no monitoramento (modo "Todos" do 2A).
  2. Fechar/reabrir o app → continua disponível (não reseta pra false).
  3. Parar o veículo >5min disponível → heartbeat mantém o marcador "ao vivo" (Android; no iOS-terminated pode ficar stale mais cedo — esperado).
  4. Toggle OFF sem rota → para de reportar; some do mapa.
- **Rollout:** só ligar a flag `DRIVER_PRESENCE_AUTO_UNAVAILABLE_ENABLED` (2B-backend) **depois** deste 2B-app publicado e validado no device.
- **Fora de escopo:** 2B-ui (indicador solto vs em-rota / online-stale); ligar a flag; leilão.
