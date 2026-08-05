# Transferência de malha — Fase 2 (conferência por pedido) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps usam checkbox (`- [ ]`).

**Goal:** No handoff da transferência, permitir marcar cada pedido do lote como **recebido** ou **não recebido** (com motivo + observação); os não-recebidos viram `FAILED` (reusando o insucesso), não avançam pro CD e **reaparecem no manifesto de retorno** pro check-in — sem migração.

**Architecture:** Backend: `DriverHandoffDto` ganha `items` opcional (outcome por pedido); o `driverHandoff` separa recebidos (→ `custody.handoff`) de não-recebidos (→ `serviceService.reportFailure(id, 'OTHER', 'MOTIVO: obs')`), depois `finishLegAfterHandoff` (Fase 1). App: o `TransferComprovanteStep` guarda o outcome por pedido; `TransferOrderList`/`TransferOrderCard` ganham modo interativo (marcar não-recebido + modal de motivo), e o payload leva `items`.

**Tech Stack:** NestJS + Prisma (agility-services, jest). React Native + Expo Router + React Query (lab-app, gate = tsc + expo lint + smoke).

## Global Constraints

- **Sem migração** (decisão do cliente): não-recebido = `ServiceStatus.FAILED` via `serviceService.reportFailure(serviceId, 'OTHER', note)`, onde `note = "${reason}: ${observação}"` (reason = rótulo do app: DANIFICADO/FALTOU/RECUSADO/OUTRO). Motivo estruturado fica pra follow-up.
- **Backward-compat:** sem `items` no payload, comportamento atual (lote inteiro recebido via `serviceIds`/default).
- **Reuso:** `reportFailure` (idempotente, já marca FAILED), `custody.handoff` (recebidos), `finishLegAfterHandoff` (Fase 1). O manifesto de retorno JÁ inclui DELIVERY FAILED — nada a fazer lá.
- **lab-app é SSH** (usuário pusha). Backend base: `feat/driver-handoff-endpoint` @ 643a6e7. App base: `feat/app-transferencia-malha` @ 62e1a51.
- **NÃO tocar** WIP: `src/hooks/lab-app.code-workspace`, `malha-modal-step1.png`.

---

### Task 1: Backend — `items` no DriverHandoffDto + split recebido/não-recebido no `driverHandoff`

**Files:**
- Create: `src/routing/dto/driver-handoff-item.dto.ts` (`DriverHandoffItemDto`)
- Modify: `src/routing/dto/driver-handoff.dto.ts` (+ `items?`)
- Modify: `src/routing/controller/routing.controller.ts` (`driverHandoff`)
- Test: `src/routing/controller/routing.controller.spec.ts`

**Interfaces:**
- Produces: `DriverHandoffItemDto = { serviceId: string; outcome: 'RECEIVED' | 'NOT_RECEIVED'; reason?: string; notes?: string }`. `DriverHandoffDto.items?: DriverHandoffItemDto[]`.

- [ ] **Step 1: DTO do item**

`driver-handoff-item.dto.ts`:
```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum HandoffOutcome {
  RECEIVED = 'RECEIVED',
  NOT_RECEIVED = 'NOT_RECEIVED',
}

export class DriverHandoffItemDto {
  @ApiProperty() @IsUUID() serviceId!: string;
  @ApiProperty({ enum: HandoffOutcome }) @IsEnum(HandoffOutcome) outcome!: HandoffOutcome;
  @ApiPropertyOptional({ description: 'Rótulo do motivo quando NOT_RECEIVED (DANIFICADO/FALTOU/RECUSADO/OUTRO).' })
  @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional({ description: 'Observação livre.' })
  @IsOptional() @IsString() notes?: string;
}
```
Em `driver-handoff.dto.ts`, adicionar:
```ts
@ApiPropertyOptional({ description: 'Conferência por pedido. Omitido = lote inteiro recebido.', type: [DriverHandoffItemDto] })
@IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DriverHandoffItemDto)
items?: DriverHandoffItemDto[];
```

- [ ] **Step 2: Teste — items mistos (recebe uns, falha outros)**

Em `routing.controller.spec.ts`, no describe de handoff, com os mocks existentes (`serviceService.findByRoutingIdMinimal`, `custodyService.handoff`, `routingService.finishLegAfterHandoff`), adicionar mock de `serviceService.reportFailure`:
```ts
it('items: recebidos vão pro custody, não-recebidos viram reportFailure', async () => {
  const legIds = ['s1','s2','s3'];
  serviceService.findByRoutingIdMinimal.mockResolvedValue(legIds.map(id => ({ id: () => id })));
  const dto = { proof: baseProof, items: [
    { serviceId: 's1', outcome: 'RECEIVED' },
    { serviceId: 's2', outcome: 'NOT_RECEIVED', reason: 'DANIFICADO', notes: 'caixa amassada' },
    { serviceId: 's3', outcome: 'RECEIVED' },
  ] };
  await controller.driverHandoff('routing-1', dto as any, user as any);
  expect(serviceService.reportFailure).toHaveBeenCalledWith('s2', 'OTHER', 'DANIFICADO: caixa amassada');
  expect(custodyService.handoff).toHaveBeenCalledWith(expect.objectContaining({ serviceIds: ['s1','s3'] }));
});
```
> Ajustar nomes/factory dos mocks ao que o arquivo já usa (ver os testes de handoff da Task 2 da Fase 1). `baseProof`/`user` = os fixtures já usados.

- [ ] **Step 3: Rodar — falha**

Run: `npx jest routing.controller.spec -t handoff`
Expected: FAIL.

- [ ] **Step 4: Split no `driverHandoff`**

No `driverHandoff`, entre a validação de `serviceIds` e a chamada ao custody, tratar `items`:
```ts
let received = serviceIds; // serviceIds já validado ⊆ legServiceIds (código atual)
const notReceived: { serviceId: string; reason?: string; notes?: string }[] = [];
if (dto.items?.length) {
  const legSet = new Set(legServiceIds);
  const invalid = dto.items.filter((it) => !legSet.has(it.serviceId));
  if (invalid.length) throw new BadRequestException(`Pedidos fora do trecho: ${invalid.map(i=>i.serviceId).join(', ')}`);
  received = dto.items.filter((it) => it.outcome === 'RECEIVED').map((it) => it.serviceId);
  for (const it of dto.items.filter((it) => it.outcome === 'NOT_RECEIVED')) {
    notReceived.push({ serviceId: it.serviceId, reason: it.reason, notes: it.notes });
  }
}
// não-recebidos: FAILED (insucesso) — reaparecem no manifesto de retorno
for (const nr of notReceived) {
  const note = [nr.reason, nr.notes].filter(Boolean).join(': ') || undefined;
  await this.serviceService.reportFailure(nr.serviceId, 'OTHER', note);
}
// recebidos: custody. Se nada recebido (tudo falhou), pula o custody (nada a entregar).
let result: any = { handoffId: null, facilityId, arrivingLegRoutingId: id, arrivedCount: 0 };
if (received.length > 0) {
  result = await this.custodyService.handoff({ facilityId, arrivingLegRoutingId: id, serviceIds: received, proof: dto.proof });
} else if (notReceived.length === 0) {
  throw new BadRequestException('Trecho sem pedidos para o handoff.');
}
```
Trocar o `if (serviceIds.length === 0) throw ...` atual pela lógica acima (o guard de "nenhum pedido" agora só vale quando não há items nem recebidos). O `finishLegAfterHandoff` + merge de `legCompleted`/`returnServiceId` (Fase 1) continua igual, depois disso.
> Confirmar assinatura real de `serviceService.reportFailure(id, reason, notes?, photoProof?)` (é `(id, 'OTHER', note)`). `HandoffOutcome`/strings: comparar com `'RECEIVED'`/`'NOT_RECEIVED'`.

- [ ] **Step 5: Rodar — passa + suíte**

Run: `npx jest routing.controller.spec` → PASS. `npx tsc --noEmit` → limpo.

- [ ] **Step 6: Commit**

```bash
git add src/routing/dto/driver-handoff-item.dto.ts src/routing/dto/driver-handoff.dto.ts src/routing/controller/routing.controller.ts src/routing/controller/routing.controller.spec.ts
git commit -m "feat(cross-docking): conferencia por pedido no handoff — nao-recebido vira FAILED (insucesso)"
```

---

### Task 2: App — outcome por pedido no `TransferOrderCard`/`List` (marcar não-recebido + motivo)

**Files:**
- Modify: `.../[id]/_components/TransferOrderCard.tsx`
- Modify: `.../[id]/_components/TransferOrderList.tsx`

**Interfaces:**
- Produces: `TransferOrderOutcome = { outcome: 'RECEIVED' | 'NOT_RECEIVED'; reason?: string; notes?: string }`. `TransferOrderList`/`Card` aceitam props OPCIONAIS de conferência: `outcomes?: Record<string, TransferOrderOutcome>`, `onMarkNotReceived?: (serviceId: string) => void`, `onMarkReceived?: (serviceId: string) => void`. Sem essas props (Tela 1) → read-only como hoje.

- [ ] **Step 1: Card interativo (aditivo, read-only por padrão)**

Em `TransferOrderCard.tsx`, adicionar props opcionais `outcome?: TransferOrderOutcome`, `onMarkNotReceived?: () => void`, `onMarkReceived?: () => void`. Quando `onMarkNotReceived` é passado, renderizar uma ação no card:
- se `outcome?.outcome !== 'NOT_RECEIVED'`: botão/toque discreto "Não recebido" → chama `onMarkNotReceived`.
- se `NOT_RECEIVED`: badge vermelho "Não recebido — {reason}" + toque "Desfazer" → `onMarkReceived`.
Não alterar o comportamento de expandir/itens (Fase 1.5) nem o visual quando as props ausentes.

- [ ] **Step 2: List repassa as props por pedido**

Em `TransferOrderList.tsx`, adicionar as props opcionais (`outcomes`, `onMarkNotReceived`, `onMarkReceived`) e repassar por `parada.serviceId` pro `TransferOrderCard` (`outcome={outcomes?.[parada.serviceId]}`, `onMarkNotReceived={() => onMarkNotReceived?.(parada.serviceId)}`, etc.). Sem as props → tudo undefined → card read-only.

- [ ] **Step 3: Typecheck + lint + commit**

Run: `npx tsc --noEmit` (0) + `npx expo lint` nos 2 arquivos (0 erros).
```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferOrderCard.tsx" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferOrderList.tsx"
git commit -m "feat(cross-docking): TransferOrderCard/List — marcar pedido nao-recebido (modo confererncia)"
```

---

### Task 3: App — estado da conferência + modal de motivo + `items` no payload (TransferComprovanteStep)

**Files:**
- Modify: `.../[id]/_components/TransferComprovanteStep.tsx`
- Modify: `src/domain/agility/routing/dto/request/routing-handoff.request.ts` (+ `items` no request)

**Interfaces:**
- Consumes: `TransferOrderList` interativo (Task 2). Produces: `RoutingHandoffRequest.items?: { serviceId; outcome; reason?; notes? }[]`.

- [ ] **Step 1: Tipo `items` no request**

Em `routing-handoff.request.ts`:
```ts
export interface RoutingHandoffItem {
    serviceId: string
    outcome: 'RECEIVED' | 'NOT_RECEIVED'
    reason?: string
    notes?: string
}
```
e no `RoutingHandoffRequest`: `items?: RoutingHandoffItem[]`.

- [ ] **Step 2: Estado + modal de motivo + payload no TransferComprovanteStep**

- Estado: `const [outcomes, setOutcomes] = useState<Record<string, { outcome: 'RECEIVED'|'NOT_RECEIVED'; reason?: string; notes?: string }>>({})` (ausente = recebido).
- Modal de motivo (reusar `Modal` do app, como a assinatura): ao "Não recebido" de um pedido, abrir modal com seletor de motivo (constantes do app: `['DANIFICADO','FALTOU','RECUSADO','OUTRO']`) + `Input` de observação → confirmar seta `outcomes[serviceId] = { outcome:'NOT_RECEIVED', reason, notes }`. "Desfazer" remove a chave.
- Passar pro `<TransferOrderList paradas={paradas} outcomes={outcomes} onMarkNotReceived={openReasonModal} onMarkReceived={clearOutcome} />`.
- No `onConfirm`, montar `items` só quando houver ao menos uma exceção (senão omitir, backward-compat):
```ts
const hasException = Object.values(outcomes).some((o) => o.outcome === 'NOT_RECEIVED');
const items = hasException
  ? paradas.map((p) => outcomes[p.serviceId]?.outcome === 'NOT_RECEIVED'
      ? { serviceId: p.serviceId, outcome: 'NOT_RECEIVED' as const, reason: outcomes[p.serviceId].reason, notes: outcomes[p.serviceId].notes }
      : { serviceId: p.serviceId, outcome: 'RECEIVED' as const })
  : undefined;
```
e incluir `items` no `payload` do `handoff({ id: routingId, payload: { proof: {...}, items } })`.
> `paradas` vem do `useRota()` (já usado). Reusar o `Modal` já importado (Fase 1.5 da assinatura). Não quebrar o gate `canSubmit` atual (recebedor + foto/assinatura continua válido; a conferência é adicional).

- [ ] **Step 3: Typecheck + lint + commit**

Run: `npx tsc --noEmit` (0) + `npx expo lint` no arquivo (0 erros).
```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferComprovanteStep.tsx" "src/domain/agility/routing/dto/request/routing-handoff.request.ts"
git commit -m "feat(cross-docking): conferencia por pedido no comprovante — motivo + items no payload"
```

---

## Smoke (gate da Fase 2 — precisa do backend deployado)

Handoff com 1+ pedido marcado "não recebido" (motivo + obs) → o pedido vira FAILED (não vai pro CD), os recebidos seguem o fluxo normal → o trecho segue pro retorno (Fase 1) → no check-in do CD de origem, o pedido não-recebido aparece no **manifesto de retorno** pra conferência. Confirmar backward-compat: sem marcar nada, comportamento idêntico ao atual (lote inteiro recebido).

## Self-Review (autor do plano)

- Cobertura da spec (Fase 2): outcome por pedido (Task 1 DTO + Task 2/3 app), não-recebido → FAILED + motivo/obs (Task 1), reaparece no retorno (reuso do manifesto — sem task), backward-compat (Task 1 sem items). ✅
- Tipos consistentes: `DriverHandoffItemDto{serviceId,outcome,reason?,notes?}` (Task 1) ↔ `RoutingHandoffItem` (Task 3) ↔ `TransferOrderOutcome` (Task 2). ✅
- Edge tudo-falhou: `received=[]` pula custody; só barra quando não há items nem recebidos. Documentado.
- Sem placeholders no caminho crítico; `>` = notas de verificação de assinatura.
