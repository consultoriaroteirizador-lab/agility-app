# Transferência de malha — Fase 1 (fechar o trecho + retorno monitorável) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development para implementar task a task. Steps usam checkbox (`- [ ]`).

**Goal:** No handoff de um trecho TRANSFERÊNCIA, fechar a rota quando não há retorno; quando há retorno, materializar a parada `RETURN` e deixar o trecho em "em retorno" até o check-in no CD de origem — espelhando o last-mile.

**Architecture:** Reuso máximo do que existe. Backend: novo método fino `RoutingService.finishLegAfterHandoff(id)` que bifurca entre `complete(id)` (já tem o gate de retorno) e `ReturnStopService.createReturnStop()` (já materializa o Service `RETURN`); chamado pelo `driverHandoff` após a custódia. App: `RoutingResponse` ganha `hasReturn`/`returnServiceId` (aditivo); o `TransferComprovanteStep` bifurca no `onSuccess` — vai pro fluxo de retorno (`parada/{returnServiceId}/retorno`, que já existe) ou pra saída atual.

**Tech Stack:** NestJS + Prisma (agility-services, jest). React Native + Expo Router + React Query (lab-app, gate = tsc + expo lint + smoke).

## Global Constraints

- **Sem novo status de routing.** "Em retorno" é derivado de um Service `RETURN` pendente + `monitor_return` — NÃO criar `RETURNING`.
- **Reusar** `ReturnStopService.createReturnStop({ routingId })` (materializa o RETURN, guarda `hasReturn()&&monitorReturn()` e devolve `returnServiceId|null`) e `RoutingService.complete(id)` (já tem o gate `ConflictException('Finalize o retorno antes de concluir')`).
- **Idempotência:** se `routing.returnServiceId()` já existe, NÃO recriar; deixar `IN_PROGRESS`.
- **Fallback (decisão do cliente):** se `createReturnStop` retornar `null` (sem endereço de retorno / falha), **concluir o trecho** (`complete`) — nunca deixar preso `IN_PROGRESS` sem RETURN.
- **lab-app é SSH** (não pusho deste ambiente — o usuário pusha). Backend: commits normais; deploy é do usuário.
- **NÃO tocar** WIP do usuário: `src/hooks/lab-app.code-workspace`, `malha-modal-step1.png`.
- Backend base: `development` do agility-services (mesma do #325). App base: `feat/app-transferencia-malha` @ HEAD atual.

---

### Task 1: Backend — `finishLegAfterHandoff` + export do `ReturnStopService`

**Files:**
- Modify: `src/optimization/optimization.module.ts` (adicionar `ReturnStopService` aos `exports`)
- Modify: `src/routing/service/routing.service.ts` (injetar `ReturnStopService` + método novo)
- Test: `src/routing/service/routing.service.spec.ts`

**Interfaces:**
- Consumes: `ReturnStopService.createReturnStop({ routingId }): Promise<string|null>`, `RoutingService.complete(id): Promise<RoutingEntity>`, `routing.hasReturn()`, `routing.monitorReturn()`, `routing.returnServiceId()`.
- Produces: `RoutingService.finishLegAfterHandoff(id: string): Promise<{ completed: boolean; returnServiceId: string | null }>` — `completed=true` quando o trecho foi concluído; `returnServiceId` preenchido quando ficou em retorno.

- [ ] **Step 1: Teste — sem retorno → conclui**

Em `routing.service.spec.ts`, no describe de handoff/finish (criar `describe('finishLegAfterHandoff')`), com mocks já usados no arquivo (repo.findById devolve entidade; `complete` stubado):
```ts
it('sem retorno: conclui o trecho', async () => {
  const routing = makeRouting({ returnToOrigin: false, returnLatitude: null, returnLongitude: null, returnServiceId: undefined });
  mockRepo.findById.mockResolvedValue(routing);
  const completeSpy = jest.spyOn(service, 'complete').mockResolvedValue(routing as any);
  const createSpy = jest.spyOn(returnStopService, 'createReturnStop');
  const r = await service.finishLegAfterHandoff('leg-1');
  expect(completeSpy).toHaveBeenCalledWith('leg-1');
  expect(createSpy).not.toHaveBeenCalled();
  expect(r).toEqual({ completed: true, returnServiceId: null });
});
```
> Ajustar `makeRouting`/nomes de mock ao que o arquivo já usa (ver os specs de `getReplay`/`complete` no mesmo arquivo). `returnStopService` = o provider injetado; adicioná-lo ao setup do módulo de teste.

- [ ] **Step 2: Rodar — falha (método não existe)**

Run: `npx jest routing.service.spec -t finishLegAfterHandoff`
Expected: FAIL (`finishLegAfterHandoff is not a function`).

- [ ] **Step 3: Export + injeção + método**

Em `optimization.module.ts`, adicionar `ReturnStopService` ao array `exports`.

Em `routing.service.ts`, adicionar ao constructor (o módulo já importa `OptimizationModule` via `forwardRef`; usar `@Optional()` como os outros opcionais do constructor pra não quebrar quem instancia o service em teste sem ele):
```ts
@Optional() private readonly returnStopService?: ReturnStopService,
```
E o método (perto de `complete`):
```ts
/**
 * Fecha um trecho após o handoff da custódia: sem retorno, conclui direto;
 * com retorno monitorável, materializa a parada RETURN (idempotente) e mantém
 * IN_PROGRESS até o check-in no CD de origem (gate em `complete`). Fallback:
 * se não der pra materializar o RETURN, conclui (não deixa preso IN_PROGRESS).
 */
async finishLegAfterHandoff(id: string): Promise<{ completed: boolean; returnServiceId: string | null }> {
  const routing = await this.findById(id);
  if (!routing.hasReturn() || !routing.monitorReturn()) {
    await this.complete(id);
    return { completed: true, returnServiceId: null };
  }
  const existing = routing.returnServiceId();
  if (existing) {
    return { completed: false, returnServiceId: existing }; // já em retorno; idempotente
  }
  const returnServiceId = this.returnStopService
    ? await this.returnStopService.createReturnStop({ routingId: id })
    : null;
  if (!returnServiceId) {
    await this.complete(id); // fallback: sem RETURN materializável, conclui
    return { completed: true, returnServiceId: null };
  }
  return { completed: false, returnServiceId };
}
```
> Confirmar o shape de `CreateReturnStopParams` (o método é `createReturnStop(params)` — ver `return-stop.service.ts:80`); passar o que ele exige (provavelmente `{ routingId }` ou `{ routing }`). Ajustar a chamada ao contrato real.

- [ ] **Step 4: Testes — com retorno (materializa), idempotente, fallback**

```ts
it('com retorno sem RETURN: materializa e NÃO conclui', async () => {
  const routing = makeRouting({ returnToOrigin: true, returnServiceId: undefined });
  mockRepo.findById.mockResolvedValue(routing);
  jest.spyOn(returnStopService, 'createReturnStop').mockResolvedValue('ret-svc-1');
  const completeSpy = jest.spyOn(service, 'complete');
  const r = await service.finishLegAfterHandoff('leg-1');
  expect(completeSpy).not.toHaveBeenCalled();
  expect(r).toEqual({ completed: false, returnServiceId: 'ret-svc-1' });
});
it('com retorno já materializado: idempotente, não recria nem conclui', async () => {
  const routing = makeRouting({ returnToOrigin: true, returnServiceId: 'ret-svc-1' });
  mockRepo.findById.mockResolvedValue(routing);
  const createSpy = jest.spyOn(returnStopService, 'createReturnStop');
  const r = await service.finishLegAfterHandoff('leg-1');
  expect(createSpy).not.toHaveBeenCalled();
  expect(r).toEqual({ completed: false, returnServiceId: 'ret-svc-1' });
});
it('retorno não materializável: fallback conclui', async () => {
  const routing = makeRouting({ returnToOrigin: true, returnServiceId: undefined });
  mockRepo.findById.mockResolvedValue(routing);
  jest.spyOn(returnStopService, 'createReturnStop').mockResolvedValue(null);
  const completeSpy = jest.spyOn(service, 'complete').mockResolvedValue(routing as any);
  const r = await service.finishLegAfterHandoff('leg-1');
  expect(completeSpy).toHaveBeenCalledWith('leg-1');
  expect(r).toEqual({ completed: true, returnServiceId: null });
});
```

- [ ] **Step 5: Rodar — passa**

Run: `npx jest routing.service.spec -t finishLegAfterHandoff`
Expected: PASS (4 casos).

- [ ] **Step 6: Commit**

```bash
git add src/optimization/optimization.module.ts src/routing/service/routing.service.ts src/routing/service/routing.service.spec.ts
git commit -m "feat(cross-docking): finishLegAfterHandoff — conclui trecho ou materializa retorno"
```

---

### Task 2: Backend — chamar `finishLegAfterHandoff` no `driverHandoff` + expor no response

**Files:**
- Modify: `src/routing/controller/routing.controller.ts` (`driverHandoff`)
- Test: `src/routing/controller/routing.controller.spec.ts`

**Interfaces:**
- Consumes: `RoutingService.finishLegAfterHandoff(id)` (Task 1).
- Produces: a resposta do `POST /routings/:id/handoff` passa a incluir `legCompleted: boolean` e `returnServiceId: string | null` junto do resultado da custódia.

- [ ] **Step 1: Teste — driverHandoff chama finishLegAfterHandoff e mescla no response**

Em `routing.controller.spec.ts`, no teste de `driverHandoff` (já existe cobertura do handoff), estender: mockar `routingService.finishLegAfterHandoff` retornando `{ completed:false, returnServiceId:'ret-1' }` e asserir que o controller o chamou com o id e que o payload de resposta contém `returnServiceId:'ret-1'` e `legCompleted:false`.

- [ ] **Step 2: Rodar — falha**

Run: `npx jest routing.controller.spec -t handoff`
Expected: FAIL.

- [ ] **Step 3: Wire no controller**

No `driverHandoff` (após `const result = await this.custodyService.handoff({...})`):
```ts
const leg = await this.routingService.finishLegAfterHandoff(id);
return ResponseHelper.success(
  { ...result, legCompleted: leg.completed, returnServiceId: leg.returnServiceId },
  'Handoff registrado com sucesso',
);
```
> `finishLegAfterHandoff` roda FORA da tx da custódia (a custódia já commitou). Se falhar, o handoff já está persistido — logar e não estourar 500 pro motorista (a carga já foi entregue). Envolver em try/catch que loga e retorna o result sem `legCompleted`/`returnServiceId` (o app degrada pra saída padrão). Confirmar se `routingService` já está injetado no controller (está — usado no próprio driverHandoff).

- [ ] **Step 4: Rodar — passa + suíte do controller**

Run: `npx jest routing.controller.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routing/controller/routing.controller.ts src/routing/controller/routing.controller.spec.ts
git commit -m "feat(cross-docking): driverHandoff conclui/retorna o trecho e expoe no response"
```

---

### Task 3: App — `hasReturn`/`returnServiceId` no RoutingResponse + tipo do handoff result

**Files:**
- Modify: `src/domain/agility/routing/dto/response/routing.response.ts`
- Modify: `src/domain/agility/routing/dto/request/routing-handoff.request.ts` (ou onde vive `RoutingHandoffResult`)

**Interfaces:**
- Produces: `RoutingResponse.hasReturn?: boolean`; `RoutingHandoffResult` ganha `legCompleted?: boolean` e `returnServiceId?: string | null`.

- [ ] **Step 1: Adicionar campos (aditivo)**

Em `routing.response.ts`, adicionar (o backend já expõe `hasReturn` no `toResponse` — ver `routing.entity.ts:784`):
```ts
hasReturn?: boolean;
```
No tipo do resultado do handoff (`RoutingHandoffResult`), adicionar:
```ts
legCompleted?: boolean;
returnServiceId?: string | null;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add "src/domain/agility/routing/dto/response/routing.response.ts" "src/domain/agility/routing/dto/request/routing-handoff.request.ts"
git commit -m "feat(cross-docking): hasReturn + returnServiceId/legCompleted no tipo do app"
```

---

### Task 4: App — `TransferComprovanteStep` bifurca pro retorno após o handoff

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferComprovanteStep.tsx`

**Interfaces:**
- Consumes: `useRoutingHandoff` (o `onSuccess` recebe `BaseResponse<RoutingHandoffResult>`), `useRota()` (routing.id), `router` do expo-router.

- [ ] **Step 1: Bifurcar no onSuccess**

O `handoff` do app usa `useRoutingHandoff({ onSuccess })`. Hoje o `onSuccess` seta `done=true` e faz `router.replace('/(auth)/(tabs)')`. Trocar por: ler o `returnServiceId` do resultado; se houver, navegar pro fluxo de retorno; senão, comportamento atual. Precisa do `routingId` (já é prop do componente) e do resultado no callback:
```tsx
const { routing } = useRota();
const { handoff } = useRoutingHandoff({
  onSuccess: (res) => {
    const returnServiceId = res?.result?.returnServiceId;
    if (returnServiceId) {
      router.replace({
        pathname: '/rotas-detalhadas/[id]/parada/[pid]/retorno' as never,
        params: { id: routing?.id ?? routingId, pid: returnServiceId } as never,
      });
      return;
    }
    setDone(true);
    setTimeout(() => router.replace('/(auth)/(tabs)'), 2000);
  },
  onError: () => { setSubmitting(false); showToast({ message: 'Não foi possível registrar a entrega. Tente novamente.', type: 'error' }); },
});
```
> Confirmar o shape que o `onSuccess` do `useMutationService` entrega (é `BaseResponse<RoutingHandoffResult>` → `res.result.returnServiceId`). O `routingId` já é prop; `routing?.id` do `useRota` é o mesmo. Usar o pathname EXATO já usado no app (`parada/[pid]/index.tsx:163`).

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit` (exit 0) e `npx expo lint "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferComprovanteStep.tsx"` (0 erros).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferComprovanteStep.tsx"
git commit -m "feat(cross-docking): apos handoff, ir pro retorno quando o trecho tem retorno"
```

---

## Smoke (gate da Fase 1 — precisa do backend deployado + RETURN materializável)

1. **Sem retorno:** trecho TRANSFER sem `return_to_origin` → handoff → resposta `legCompleted:true` → trecho some do "em andamento"; tracking desliga.
2. **Com retorno (RHBPBUC após materializar/recriar):** handoff → resposta traz `returnServiceId` → app abre `parada/{returnServiceId}/retorno` → monitoramento web mostra "em retorno" (central vê o caminhão) → dirigir ao CD origem → check-in (conclui o RETURN) → `useCompleteRouting` fecha o trecho (gate passa) → `COMPLETED`, tracking desliga.

> Risco a verificar no smoke: o `ParadaContext`/tela de retorno carrega o Service `RETURN` de um trecho TRANSFER igual carrega no last-mile (é Service comum com `serviceType=RETURN`). Se algum ponto do fluxo de retorno assumir contexto de last-mile, ajustar pra ser agnóstico.

## Self-Review (autor do plano)

- Cobertura da spec (Fase 1): fechar sem retorno (Task 1/2), materializar retorno + "em retorno" (Task 1/2, reuso do monitor), app navega pro retorno (Task 4), check-in fecha (reuso `useCompleteRouting`/`complete` gate — sem task nova). ✅
- Tipos consistentes: `finishLegAfterHandoff → { completed, returnServiceId }` (Task 1) consumido no controller (Task 2) e espelhado em `RoutingHandoffResult.legCompleted/returnServiceId` (Task 3) consumido no app (Task 4). ✅
- Sem placeholders no caminho crítico; os `>` são notas de verificação de contrato (assinaturas reais a confirmar na implementação), não TODOs de lógica.
