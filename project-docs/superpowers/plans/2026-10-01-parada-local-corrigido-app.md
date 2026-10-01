# Corrigir local de parada em rota despachada — Plano do app do motorista

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** quando a central corrige o local de uma parada da rota do motorista, o app mostra a notificação "Local de parada corrigido", leva direto à parada e atualiza a coordenada dela, inclusive o link do Waze/Maps, sem o motorista recarregar nada.

**Architecture:**
- **Tipo novo de notificação**, `ROUTE_STOP_RELOCATED`, com destino na tela da parada (`notificationTarget.ts`).
- **A parada passa a ser recarregada em dois momentos:**
  - em todo push recebido: `KEY_SERVICES` entra em `PUSH_INVALIDATED_KEYS`;
  - em todo `routing_updated` da rota aberta: `useRouteLiveSync` passa a usar `routeLiveSyncKeys`, que inclui o prefixo `KEY_SERVICES`.

  Hoje a tela da parada (`['services', serviceId]`, `staleTime` de 5 min) não é atingida por nenhum dos dois, e o link de navegação sai desse cache.

**Tech Stack:** Expo / React Native, expo-router, TanStack Query, Jest (`jest-expo`).

**Spec:** `agility-frontend-platform/project-docs/superpowers/specs/2026-10-01-corrigir-local-parada-rota-despachada-design.md`. Planos irmãos: backend (`agility-services`) e front web (`agility-frontend-platform`), com o mesmo nome de arquivo e sufixos `-backend` e `-front`.

## Global Constraints

- Branch `feat/parada-local-corrigido`, a partir de `origin/main` **buscado agora**. O `origin/main` local fica defasado se o fetch não roda. Busque com `git fetch https://DanielASantos-dev@github.com/consultoriaroteirizador-lab/agility-app.git main:refs/remotes/origin/main --force`. A PR vai para `main`.
- **Depende do backend no ar.** Sem ele, o tipo novo simplesmente nunca chega, e as mudanças de cache seguem valendo para os eventos que já existem.
- `routeStopChangedKeys` **não** muda: é o conjunto dos fluxos que mudam o status de uma parada (conclusão, insucesso). O conjunto mais largo do live sync é uma função nova.
- Testes: `npx jest <caminho>`, **nunca** `npm test` (o script é `--watchAll` e não termina). No fim de cada task rode `npx tsc --noEmit` e `npx expo lint`.

## Review Focus

1. **Notificação sem `serviceId` no metadata** (backend antigo ou dado legado): leva à rota, não a uma tela de parada quebrada. Teste: Task 1.
2. **`routing_updated` de OUTRA rota:** o filtro por `routeId` do `useRouteLiveSync` continua barrando. Nada nesta mudança mexe no filtro; teste de chaves na Task 3.
3. **Push de qualquer outro tipo com a tela da parada aberta:** a parada é refeita, uma requisição a mais e aceita. Teste: Task 2.
4. **Motorista na tela da parada quando o `routing_updated` chega:** a coordenada nova aparece. A tela da rota fica montada embaixo na pilha do expo-router, e é ela que tem o `useRouteLiveSync`. Isso é conferido no dev (Task 4), porque o teste unitário prova as chaves, não a pilha.
5. **Coordenada já aberta no Waze:** o app não alcança o Waze. Quem cobre é o push, que manda conferir. Fora do alcance de teste e registrado na spec.

---

### Task 1: Tipo `ROUTE_STOP_RELOCATED` e destino

**Files:**
- Modify: `src/domain/agility/notification/dto/response/notification-response.dto.ts` (`enum NotificationType`)
- Modify: `src/domain/agility/notification/notificationTarget.ts`
- Test: `src/domain/agility/notification/__tests__/notificationTarget.test.ts`

**Interfaces:**
- Produces: `NotificationType.ROUTE_STOP_RELOCATED`; `resolverDestinoDaNotificacao` leva a `/rotas-detalhadas/{routingId}/parada/{serviceId}`; o ícone é `edit-location`.

- [ ] **Step 1: Escreva os testes (falham)**

No `it.each` de `resolverDestinoDaNotificacao`, acrescente as linhas:

```ts
        [NotificationType.ROUTE_STOP_RELOCATED, { routingId: 'r1', serviceId: 's1' }, '/rotas-detalhadas/r1/parada/s1'],
        // Sem a parada no metadata (backend antigo), a rota ainda é o melhor destino.
        [NotificationType.ROUTE_STOP_RELOCATED, { routingId: 'r1' }, '/rotas-detalhadas/r1'],
```

E acrescente, no `describe` do ícone (ou num novo, se não houver):

```ts
describe('iconeDaNotificacao — local corrigido', () => {
    it('usa edit-location', () => {
        expect(iconeDaNotificacao(NotificationType.ROUTE_STOP_RELOCATED)).toBe('edit-location');
    });
});
```

Run: `npx jest src/domain/agility/notification/__tests__/notificationTarget.test.ts`
Expected: FAIL, porque `ROUTE_STOP_RELOCATED` não existe.

- [ ] **Step 2: Implemente**

No `enum NotificationType`, depois de `CHAT_MESSAGE`:

```ts
    ROUTE_STOP_RELOCATED = 'ROUTE_STOP_RELOCATED',
```

Em `resolverDestinoDaNotificacao`, junte o tipo novo ao caso de `SERVICE_ADDED`/`SERVICE_REMOVED`:

```ts
        case NotificationType.SERVICE_ADDED:
        case NotificationType.SERVICE_REMOVED:
        // A central corrigiu o local da parada: o motorista confere NA parada.
        case NotificationType.ROUTE_STOP_RELOCATED:
            if (routingId && serviceId) return caminho(`/rotas-detalhadas/${routingId}/parada/${serviceId}`);
            return routingId ? caminho(`/rotas-detalhadas/${routingId}`) : null;
```

Em `iconeDaNotificacao`, antes do `case NotificationType.SYSTEM_ALERT`:

```ts
        case NotificationType.ROUTE_STOP_RELOCATED:
            return 'edit-location';
```

Se o `tsc` acusar que `'edit-location'` não cabe em `IconNameMaterial`, confira a definição em `src/components/Icon/Icon.tsx`. O glifo existe no `MaterialIcons.json` do `@expo/vector-icons`. Se o tipo for uma lista fechada, acrescente o nome a ela.

- [ ] **Step 3: Rode e confirme que passa**

Run: `npx jest src/domain/agility/notification/__tests__/notificationTarget.test.ts` e `npx tsc --noEmit`
Expected: PASS e 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/domain/agility/notification
git commit -m "feat(notificacao): ROUTE_STOP_RELOCATED leva o motorista a parada corrigida"
```

---

### Task 2: Push recarrega a parada aberta

**Files:**
- Modify: `src/domain/queryKeys.ts` (`PUSH_INVALIDATED_KEYS`)
- Test: `src/domain/__tests__/queryKeys.test.ts`

- [ ] **Step 1: Escreva o teste (falha)**

Em `queryKeys.test.ts`, importe `KEY_SERVICES` e `QueryClient` (`@tanstack/react-query`) e acrescente, no `describe('PUSH_INVALIDATED_KEYS'`:

```ts
    // ROUTE_STOP_RELOCATED: a central corrigiu o local da parada. A tela da parada
    // (`['services', serviceId]`, staleTime 5 min) monta o link do Waze/Maps a partir
    // dessa query — sem esta chave, o motorista tocava o push e navegava para o
    // endereço ANTIGO.
    it('push invalida a parada aberta (link de navegação sai dela)', () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData([KEY_SERVICES, 'servico-1'], {});

        for (const key of PUSH_INVALIDATED_KEYS) {
            void queryClient.invalidateQueries({ queryKey: [key] });
        }

        expect(queryClient.getQueryState([KEY_SERVICES, 'servico-1'])?.isInvalidated).toBe(true);
    });
```

Run: `npx jest src/domain/__tests__/queryKeys.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implemente**

Em `PUSH_INVALIDATED_KEYS`, acrescente `KEY_SERVICES` e complete o comentário acima da constante:

```ts
 *
 * `KEY_SERVICES` entrou com ROUTE_STOP_RELOCATED (01/10/2026): a central corrige o
 * local de uma parada da rota do motorista, e a tela da parada — de onde sai o link
 * do Waze/Maps — guardava a coordenada antiga por até 5 min. Invalidar só refaz o que
 * está montado, então com a parada fechada o custo é zero.
```

```ts
export const PUSH_INVALIDATED_KEYS: readonly string[] = [
    KEY_ROUTINGS,
    KEY_NOTIFICATIONS,
    KEY_CHATS,
    KEY_TICKETS,
    KEY_WALLET,
    KEY_FINANCE,
    KEY_SERVICES,
]
```

Confira em `NotificationContext.tsx` (~linha 140) que o laço usa `queryKey: [key]`, ou seja, prefixo. Se usar outra forma, ajuste o teste para a forma real.

- [ ] **Step 3: Rode e confirme que passa**

Run: `npx jest src/domain/__tests__/queryKeys.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/domain/queryKeys.ts src/domain/__tests__/queryKeys.test.ts
git commit -m "fix(notificacao): push recarrega a parada aberta"
```

---

### Task 3: `routing_updated` recarrega a parada

**Files:**
- Modify: `src/domain/queryKeys.ts` (nova `routeLiveSyncKeys`)
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_hooks/useRouteLiveSync.ts`
- Test: `src/domain/__tests__/routeStopQueryKeys.test.ts`

**Interfaces:**
- Produces: `routeLiveSyncKeys(rotaId: string): unknown[][]`.

- [ ] **Step 1: Escreva o teste (falha)**

Em `routeStopQueryKeys.test.ts`, importe `routeLiveSyncKeys` e acrescente:

```ts
describe('routeLiveSyncKeys (routing_updated / service_updated ao vivo)', () => {
    // O evento não diz QUAL parada mudou. Antes, a tela da parada aberta
    // (`['services', serviceId]`) ficava fora: a correção de local feita pela
    // central não aparecia, e o link do Waze/Maps abria no endereço antigo.
    it('atinge a parada aberta, sem precisar saber o id dela', () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData([KEY_SERVICES, 'servico-9'], {});

        for (const queryKey of routeLiveSyncKeys(ROTA_ID)) {
            void queryClient.invalidateQueries({ queryKey });
        }

        expect(queryClient.getQueryState([KEY_SERVICES, 'servico-9'])?.isInvalidated).toBe(true);
    });

    it('mantém tudo o que routeStopChangedKeys já invalidava (map-data incluso)', () => {
        const keys = routeLiveSyncKeys(ROTA_ID);
        for (const k of routeStopChangedKeys(ROTA_ID)) {
            expect(keys).toContainEqual(k);
        }
    });

    it('não atinge a carteira (reprojeção de ETA não move dinheiro)', () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData([KEY_WALLET], {});

        for (const queryKey of routeLiveSyncKeys(ROTA_ID)) {
            void queryClient.invalidateQueries({ queryKey });
        }

        expect(queryClient.getQueryState([KEY_WALLET])?.isInvalidated).toBe(false);
    });
});
```

Run: `npx jest src/domain/__tests__/routeStopQueryKeys.test.ts`
Expected: FAIL, porque `routeLiveSyncKeys` não existe.

- [ ] **Step 2: Implemente**

Em `queryKeys.ts`, logo depois de `routeStopChangedKeys`:

```ts
/**
 * Chaves do live sync da rota aberta (`useRouteLiveSync`: `routing_updated` /
 * `service_updated` do `/monitoring`). É o conjunto de `routeStopChangedKeys` MAIS
 * o prefixo `KEY_SERVICES`, porque o evento não diz qual parada mudou e a tela da
 * parada (`['services', serviceId]`) precisa refazer — é dela que sai o link do
 * Waze/Maps quando a central corrige o local (ROUTE_STOP_RELOCATED, 01/10/2026).
 *
 * Função separada, e não um item a mais em `routeStopChangedKeys`, porque aquela
 * roda nos fluxos de conclusão/insucesso, que sabem a parada exata.
 */
export function routeLiveSyncKeys(rotaId: string): unknown[][] {
    return [...routeStopChangedKeys(rotaId), [KEY_SERVICES]]
}
```

Em `useRouteLiveSync.ts`, troque o import e o laço:

```ts
import { routeLiveSyncKeys } from '@/domain/queryKeys'
```

```ts
        for (const queryKey of routeLiveSyncKeys(routeId)) {
```

Atualize o comentário do topo do hook. Troque "invalida as queries de routing/services" por "invalida as queries de routing/services, inclusive a parada aberta (`routeLiveSyncKeys`)".

- [ ] **Step 3: Rode e confirme que passa**

Run: `npx jest src/domain/__tests__ src/domain/agility/notification` e `npx tsc --noEmit`
Expected: PASS e 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/domain/queryKeys.ts src/domain/__tests__/routeStopQueryKeys.test.ts "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_hooks/useRouteLiveSync.ts"
git commit -m "fix(rota): routing_updated recarrega tambem a parada aberta"
```

---

### Task 4: Verificação no dev (com o backend já publicado)

Sem código. O resultado vai no corpo da PR.

- [ ] **Step 1:** Logado como motorista de uma rota `IN_PROGRESS`, abra a tela de uma parada pendente. Na central, corrija o local dessa parada em `/monitoring`.
  - Esperado: o push "Local de parada corrigido" chega; o endereço e o link do Waze/Maps da parada aberta passam a usar a coordenada nova sem sair da tela.
- [ ] **Step 2:** Toque no push com o app em background.
  - Esperado: abre a tela daquela parada.
- [ ] **Step 3:** Repita o passo 1 com a tela da **rota** aberta.
  - Esperado: a ordem das paradas não muda e os horários previstos se atualizam.
- [ ] **Step 4 — dúvida da spec (filial do WebSocket):** se o passo 1 não atualizar ao vivo e só o push funcionar, leia `monitoring.gateway.ts` (agility-services, ~linhas 347 e 501-504) e compare o `branch_id` do token do motorista com o `branchId` da rota.
  - Registre na PR o que achou. **Não** corrija o gateway nesta PR: é do backend, e a regra de filial tem outros consumidores.

---

### Task 5: PR

- [ ] **Step 1:** Push:

```bash
export GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never
timeout 60 git push -q https://DanielASantos-dev@github.com/consultoriaroteirizador-lab/agility-app.git HEAD:refs/heads/feat/parada-local-corrigido
```

- [ ] **Step 2:** Abra a PR para `main` (MCP `create_pull_request`). No corpo:
  - o link da spec e das PRs do backend e do front;
  - "publicar depois do backend";
  - o resultado da Task 4, ou "não validado no dev" se ela não rodou;
  - o lembrete de que só versões novas do app recarregam a parada. Versões antigas recebem o push como notificação genérica.
