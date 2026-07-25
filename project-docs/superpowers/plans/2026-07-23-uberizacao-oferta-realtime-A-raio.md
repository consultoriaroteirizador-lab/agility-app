# Uberização Oferta em Tempo Real — Plano A: Raio Funcional

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a oferta de uberização chegar apenas a motoristas dentro de um raio configurado — habilitando o filtro PROXIMITY (que já existe no backend) via um campo de raio no operador.

**Architecture:** O backend já filtra por distância quando `offer.offerType === 'PROXIMITY'` + origem + `broadcastRadiusKm`. Basta o front operador enviar esses campos para `public_auction` (hoje ele força `ALL`). Um campo "Raio de oferta (km)" no `DirectOptimizationModal` controla isso.

**Tech Stack:** Backend NestJS/Jest; Front Next.js/TS (jest sem RTL → verificação por tsc + revisão de diff).

## Global Constraints

- Raio é **por-rota**, default de `userSettings.defaultOffer.broadcastRadiusKm`. Distância medida de `routing.origin` → localização do motorista (comportamento já existente do backend).
- Só aplica a `public_auction` (a única categoria que faz broadcast hoje). Sem raio → `offerType: 'ALL'` (comportamento atual).
- **Dependência:** A1 estende o objeto `offer` do payload de otimização introduzido no PR #286 (frete/valueMode). Basear A1 em `development` já com #286 mergeado, ou na branch do #286.
- Reusa `DistanceCalculatorService` (não reimplementar geodistância).

---

### Task A2: Backend — confirmar origem persistida + teste do filtro PROXIMITY

**Files:**
- Test: `src/routing/service/routing-offer-notification.service.spec.ts` (criar se não existir)
- (Verificação, sem código de produção esperado): `src/optimization/services/routing-creation.service.ts`, `src/routing/service/routing.service.ts:3610`

**Interfaces:**
- Consumes: `RoutingOfferNotificationService.notifyEligibleDrivers(routing, companyId)`.

- [ ] **Step 1: Confirmar que `public_auction` persiste origem.** Ler `routing.service.ts:3484-3493` e `:3610-3611` — `originLatitude/originLongitude` são derivados de `origin.latitude/longitude` (setados em `routing-creation.service.ts:223-229` a partir de `vehicleInfo.startLat/startLon`). Documentar no report: em que condição a origem pode faltar (sem `vehicleInfo.startLat` e sem `originAddressId`). Se faltar, o filtro PROXIMITY já barra (não notifica) — comportamento seguro.

- [ ] **Step 2: Escrever teste do filtro PROXIMITY** (garante que o filtro existente funciona quando recebe PROXIMITY + raio + origem):

```ts
// mock: DistanceCalculatorService.calculateDistance retorna 5 p/ driver A, 50 p/ driver B
// routing: publicOffer=true, offerType=PROXIMITY, origin (lat/lng), broadcastRadiusKm=10
it('notifica só drivers dentro do raio quando PROXIMITY', async () => {
    // driverA disponível + localização (dist 5 ≤ 10) → notificado
    // driverB disponível + localização (dist 50 > 10) → NÃO notificado
    // driverC indisponível → NÃO notificado
    await service.notifyEligibleDrivers(routingProximity, 'company-1');
    expect(emitRouteOfferAvailable).toHaveBeenCalledTimes(1);
    expect(emitRouteOfferAvailable).toHaveBeenCalledWith('company-1', expect.any(String), routingProximity.id(), routingProximity.code());
});

it('notifica todos disponíveis quando ALL (sem filtro de distância)', async () => {
    await service.notifyEligibleDrivers(routingAll, 'company-1');
    expect(emitRouteOfferAvailable).toHaveBeenCalledTimes(2); // A e B, C indisponível
});
```

- [ ] **Step 3: Rodar** `npx jest --testPathPatterns "routing-offer-notification"` → PASS. (Se o teste já cobre isso, apenas confirmar verde e documentar.)

- [ ] **Step 4: Commit**

```bash
git add src/routing/service/routing-offer-notification.service.spec.ts
git commit -m "test(offer): filtro PROXIMITY por raio (dentro/fora) + ALL notifica todos disponíveis"
```

---

### Task A1: Front operador — campo "Raio de oferta (km)" + PROXIMITY no payload

**Files:**
- Modify: `src/app/roteirization/new/components/DirectOptimizationModal.tsx` (perto do seletor de frete do #286: estado ~144; payload `offer` ~1028-1035)
- Modify: `src/domain/agility/optimization/dto/request/optimize-direct.request.ts` (o tipo `offer` já tem `broadcastRadiusKm?` e `offerType?` do #286 — confirmar)

**Interfaces:**
- Produces: quando `public_auction` + raio preenchido, o payload leva `offer.offerType = 'PROXIMITY'` e `offer.broadcastRadiusKm = <km>`.

- [ ] **Step 1: Estado do raio** (junto de `freightMode`/`routeTotalBRL`, ~linha 144):

```tsx
    const [broadcastRadiusKm, setBroadcastRadiusKm] = useState<string>("")
```

- [ ] **Step 2: UI do campo** — dentro do bloco do seletor de frete (que já é gated por `internal_auction`/`public_auction`), mostrar só quando `public_auction`:

```tsx
                        {routingCategory === 'public_auction' && (
                            <div className="mt-3">
                                <label className="block text-sm font-medium text-[#344054] mb-1">Raio de oferta (km)</label>
                                <input inputMode="numeric" value={broadcastRadiusKm}
                                    onChange={(e) => setBroadcastRadiusKm(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="vazio = todos os disponíveis"
                                    className="w-full border border-[#D0D5DD] rounded-lg px-3 py-2 text-sm" />
                                <p className="text-xs text-gray-500 mt-1">Com raio, só motoristas dentro da distância recebem. Vazio envia para todos os disponíveis.</p>
                            </div>
                        )}
```

- [ ] **Step 3: Enviar PROXIMITY + raio no payload** — no objeto `offer` do payload (~1028-1035 do #286), ajustar `offerType`/`broadcastRadiusKm`:

```tsx
            offer: (routingCategory === 'internal_auction' || routingCategory === 'public_auction')
                ? {
                    publicOffer: routingCategory === 'public_auction',
                    offerType: (routingCategory === 'public_auction' && Number(broadcastRadiusKm) > 0) ? 'PROXIMITY' : 'ALL',
                    ...(routingCategory === 'public_auction' && Number(broadcastRadiusKm) > 0
                        ? { broadcastRadiusKm: Number(broadcastRadiusKm) }
                        : {}),
                    valueMode: freightMode,
                    ...(freightMode === 'TOTAL' ? { totalValue: parseBRLToNumber(routeTotalBRL) || 0 } : {}),
                }
                : undefined,
```

- [ ] **Step 4: Default de settings** (opcional, se `userSettingsData.defaultOffer.broadcastRadiusKm` existir): inicializar `broadcastRadiusKm` a partir do settings quando abrir o modal. Se não trivial, deixar vazio (follow-up).

- [ ] **Step 5: Verificar** `npx tsc --noEmit` → exit 0. Manual: `public_auction` com raio 15 → payload `offer.offerType='PROXIMITY'` + `broadcastRadiusKm=15`; sem raio → `offerType='ALL'` sem `broadcastRadiusKm`.

- [ ] **Step 6: Commit**

```bash
git add src/app/roteirization/new/components/DirectOptimizationModal.tsx
git commit -m "feat(roteirizacao): campo Raio de oferta (km) — PROXIMITY quando preenchido"
```

## Self-Review

- **Cobertura:** raio → PROXIMITY (A1); backend já filtra, coberto por teste (A2). ✔
- **Placeholders:** nenhum; código real. ✔
- **Risco:** se a rota não tiver origem, PROXIMITY não notifica ninguém (seguro, documentado em A2 Step 1). Dependência do #286 declarada nos Global Constraints.
