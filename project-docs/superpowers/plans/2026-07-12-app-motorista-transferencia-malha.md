# App do motorista — Transferência de malha (handoff) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O motorista executa um trecho de TRANSFERÊNCIA de malha (CD1→CD2) e registra o handoff/comprovante no destino, movendo a carga pro last-mile — fechando o teste fim-a-fim.

**Architecture:** Backend ganha um endpoint driver-scoped `POST /routings/:id/handoff` que valida posse, deriva o contexto do trecho no servidor e reusa o `custody.handoff` existente. O app fica ciente do trecho (campos de malha no `RoutingResponse`), renderiza uma tela de execução de transferência quando `routing.legType === 'TRANSFER'`, captura o comprovante (quem recebeu + foto/assinatura) e chama o novo endpoint.

**Tech Stack:** Backend NestJS + Prisma (`agility-services`); App React Native + Expo Router + React Query (`lab-app`).

## Global Constraints

- **Não tocar** o fluxo existente `serviceType=TRANSFER` (uberização, nível parada). A malha é chaveada por `routing.legType` (nível rota) — ortogonal.
- **Chavear sempre em `legType` + campos do próprio trecho** (nunca "é a transferência" / "é o último trecho") — blindagem multi-hop.
- **Handoff = lote de `serviceIds` + comprovante.** O endpoint aceita `serviceIds?` OPCIONAL (default = lote inteiro do trecho, derivado no servidor) — pronto pra conferência por palete/pedido no futuro, sem mudança de contrato.
- **Comprovante exige ≥1 foto OU assinatura** (espelha a validação do backend `custody.service`).
- Role do endpoint: `COLLABORATOR_ADMIN/MANAGER/SUPERVISOR/COLLABORATOR_DRIVER` + `verifyDriverOwnership` (mesmo idiom de `start`/`complete`/`return-manifest`).
- Gate de UI do app = **smoke manual** (a própria demo).

---

## File Structure

**Backend (`agility-services`):**
- `src/routing/dto/driver-handoff.dto.ts` (novo) — `DriverHandoffDto { proof: CustodyHandoffProofDto; serviceIds?: string[] }`.
- `src/custody/custody.module.ts` — exporta `CustodyService`; `RoutingModule` vira `forwardRef`.
- `src/routing/routing.module.ts` — importa `forwardRef(() => CustodyModule)`.
- `src/routing/controller/routing.controller.ts` — `@Post(':id/handoff')` (injeta `CustodyService` via forwardRef + `ServiceService`).

**App (`lab-app`):**
- `src/domain/agility/routing/dto/response/routing.response.ts` — + campos de malha.
- `src/domain/agility/routing/routingAPI.ts` + `routingService.ts` — `handoff`.
- `src/domain/agility/routing/useCase/useRoutingHandoff.ts` (novo) — mutation hook.
- `src/domain/agility/routing/dto/request/` — `RoutingHandoffRequest` type.
- `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferLegExecution.tsx` (novo) — tela de execução.
- `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/index.tsx` — branch `legType==='TRANSFER'`.

---

## Phase A — Backend (`C:\Users\daniel\Agility\Front\agility-services`)

> Criar branch `feat/driver-handoff-endpoint` a partir de `origin/development`.

### Task A1: Endpoint driver-scoped `POST /routings/:id/handoff`

**Files:**
- Create: `src/routing/dto/driver-handoff.dto.ts`
- Modify: `src/custody/custody.module.ts`
- Modify: `src/routing/routing.module.ts`
- Modify: `src/routing/controller/routing.controller.ts`

**Interfaces:**
- Consumes: `custodyService.handoff(dto: CreateCustodyHandoffDto): Promise<CustodyHandoffResponseDto>` (`src/custody/custody.service.ts:51`); `CustodyHandoffProofDto` (`src/custody/dto/create-custody-handoff.dto.ts`); `serviceService.findByRoutingIdMinimal(id): Promise<ServiceEntity[]>` (`src/service/service/service.service.ts`); `routing.destinationFacilityId()`/`nextLegRoutingId()`/`driverId()` (`routing.entity.ts:292-300`); `verifyDriverOwnership` (`routing.controller.ts:895`).
- Produces: `POST /routings/:id/handoff` → `{ handoffId, facilityId, arrivingLegRoutingId, arrivedCount, nextLegRoutingId?, departedCount? }`.

- [ ] **Step 1: DTO**

Create `src/routing/dto/driver-handoff.dto.ts` (reusa o `CustodyHandoffProofDto` existente):
```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CustodyHandoffProofDto } from 'src/custody/dto/create-custody-handoff.dto';

/**
 * Handoff executado pelo MOTORISTA no CD de destino de um trecho de transferência.
 * O `arrivingLegRoutingId`, `facilityId` e (default) o lote de `serviceIds` são
 * derivados no servidor a partir do trecho `:id` — o motorista não os informa.
 */
export class DriverHandoffDto {
    @ApiProperty({ description: 'Prova do handoff (foto e/ou assinatura + quem recebeu).', type: CustodyHandoffProofDto })
    @ValidateNested()
    @Type(() => CustodyHandoffProofDto)
    proof!: CustodyHandoffProofDto;

    @ApiPropertyOptional({
        description: 'Subconjunto do lote (conferência por palete/pedido). Omitido = lote inteiro do trecho.',
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsUUID('all', { each: true })
    serviceIds?: string[];
}
```

- [ ] **Step 2: Módulo — exportar CustodyService + quebrar o ciclo com forwardRef**

Em `src/custody/custody.module.ts`, trocar o import de `RoutingModule` por `forwardRef` e **exportar** `CustodyService`:
```ts
import { forwardRef, Module } from '@nestjs/common';
// ...
@Module({
    imports: [DbModule, ServiceMovementModule, CustodyHandoffModule, forwardRef(() => RoutingModule), ServiceModule],
    controllers: [CustodyController],
    providers: [CustodyService],
    exports: [CustodyService],
})
export class CustodyModule {}
```

Em `src/routing/routing.module.ts`, importar `forwardRef(() => CustodyModule)` (adicionar ao array `imports`; manter os demais):
```ts
import { forwardRef, Module } from '@nestjs/common';
import { CustodyModule } from 'src/custody/custody.module';
// ...
imports: [ /* ...existentes... */, forwardRef(() => CustodyModule) ],
```
> Se `RoutingModule` já não importa `ServiceModule`, adicioná-lo também (necessário pro `ServiceService` no controller). Verificar o array `imports` atual.

- [ ] **Step 3: Injetar CustodyService (forwardRef) + ServiceService no controller**

Em `src/routing/controller/routing.controller.ts`, no construtor, adicionar (mantendo os existentes `routingService`/`collaboratorService`/`driverService`/`mapper`):
```ts
import { forwardRef, Inject, BadRequestException } from '@nestjs/common';
import { CustodyService } from 'src/custody/custody.service';
import { ServiceService } from 'src/service/service/service.service';
// ...
constructor(
    // ...existentes...
    @Inject(forwardRef(() => CustodyService)) private readonly custodyService: CustodyService,
    private readonly serviceService: ServiceService,
) {}
```

- [ ] **Step 4: O handler**

Em `routing.controller.ts`, adicionar entre os handlers `:id/xxx` (ex.: perto de `:id/services`/`:id/apply` — não precisa preceder o `@Get(':id')` porque é rota de 2 segmentos):
```ts
@Post(':id/handoff')
@Roles('COLLABORATOR_ADMIN', 'COLLABORATOR_MANAGER', 'COLLABORATOR_SUPERVISOR', 'COLLABORATOR_DRIVER')
@ApiOperation({ summary: 'Handoff de custódia executado pelo motorista no CD de destino do trecho' })
@ApiParam({ name: 'id', type: String })
@ApiResponse({ status: 201, description: 'Handoff registrado' })
@ApiResponse({ status: 403, description: 'Forbidden - trecho não atribuído ao motorista' })
async driverHandoff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DriverHandoffDto,
    @CurrentUser() user?: AuthenticatedUser,
) {
    await this.verifyDriverOwnership(id, user);
    const routing = await this.routingService.findById(id);

    const facilityId = routing.destinationFacilityId();
    if (!facilityId) {
        throw new BadRequestException('Trecho sem CD de destino — não é um trecho de transferência de malha.');
    }

    // Lote do trecho (derivado no servidor). Se o corpo trouxe um subconjunto
    // (conferência por palete/pedido), valida que ⊆ lote do trecho.
    const legServiceIds = (await this.serviceService.findByRoutingIdMinimal(id)).map((s) => s.id()!);
    let serviceIds = legServiceIds;
    if (dto.serviceIds?.length) {
        const legSet = new Set(legServiceIds);
        const invalid = dto.serviceIds.filter((sid) => !legSet.has(sid));
        if (invalid.length) {
            throw new BadRequestException(`Pedidos fora do trecho: ${invalid.join(', ')}`);
        }
        serviceIds = dto.serviceIds;
    }
    if (serviceIds.length === 0) {
        throw new BadRequestException('Trecho sem pedidos para o handoff.');
    }

    // custody.handoff deriva `nextLegRoutingId` do próprio trecho quando não informado.
    const result = await this.custodyService.handoff({
        facilityId,
        arrivingLegRoutingId: id,
        serviceIds,
        proof: dto.proof,
    });
    return ResponseHelper.success(result, 'Handoff registrado com sucesso');
}
```
Adicionar o import do DTO no topo: `import { DriverHandoffDto } from '../dto/driver-handoff.dto';` (ajustar o caminho relativo real).

- [ ] **Step 5: Typecheck + boot**

Run: `cd "C:\Users\daniel\Agility\Front\agility-services" && npx tsc --noEmit`
Expected: limpo (exit 0). Se houver erro de dependência circular em runtime, confirmar que AMBOS os lados usam `forwardRef` (CustodyModule↔RoutingModule) e que `CustodyService` está em `exports`.

- [ ] **Step 6: Teste do handler (posse + derivação)**

Criar/estender um teste do `RoutingController` (jest) cobrindo:
```ts
// pseudocode do teste — mockar routingService.findById, serviceService.findByRoutingIdMinimal,
// custodyService.handoff, e o verifyDriverOwnership (collaborator/driver).
it('deriva facilityId + lote do trecho e chama custody.handoff', async () => {
    // routing com destinationFacilityId='CD2', 2 services
    // controller.driverHandoff('leg1', { proof }, driverUser)
    // espera custodyService.handoff chamado com { facilityId:'CD2', arrivingLegRoutingId:'leg1', serviceIds:['s1','s2'], proof }
});
it('403 quando o trecho não é do motorista', async () => { /* verifyDriverOwnership lança */ });
it('400 quando o trecho não tem destinationFacilityId', async () => { /* routing sem CD destino */ });
it('400 quando serviceIds do corpo não ⊆ lote do trecho', async () => { /* subconjunto inválido */ });
```
Run: `npx jest routing.controller` (ou o caminho do spec). Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/routing src/custody
git commit -m "feat(cross-docking): endpoint driver-scoped POST /routings/:id/handoff"
```

---

## Phase B — App (`C:\Users\daniel\Agility\Front\lab-app`)

> A Fase B depende do endpoint da Fase A (deploy). A UI pode ser construída antes; o handoff só fecha com o backend no ar. Criar branch própria off a branch de trabalho do app.

### Task B1: Campos de malha no `RoutingResponse`

**Files:**
- Modify: `src/domain/agility/routing/dto/response/routing.response.ts`

**Interfaces:**
- Produces: `RoutingResponse.legType?`, `.parentRoutingId?`, `.nextLegRoutingId?`, `.originFacilityName?`, `.destinationFacilityName?`. Consumido por B3.

- [ ] **Step 1: Adicionar os campos (aditivos, opcionais)**

Em `routing.response.ts`, dentro da interface `RoutingResponse` (antes de `createdAt`):
```ts
    /** Cross-docking: papel do trecho na malha. null/undefined em rota comum. */
    legType?: 'TRANSFER' | 'LAST_MILE' | null
    /** Cross-docking: rota-mãe da malha. */
    parentRoutingId?: string | null
    /** Cross-docking: próximo trecho na cadeia (last-mile ou próximo CD). */
    nextLegRoutingId?: string | null
    /** Cross-docking: nome do CD de origem do trecho (faixa de hops). */
    originFacilityName?: string | null
    /** Cross-docking: nome do CD de destino do trecho. */
    destinationFacilityName?: string | null
```

- [ ] **Step 2: Typecheck**

Run: `cd "C:\Users\daniel\Agility\Front\lab-app" && npx tsc --noEmit`
Expected: limpo.

- [ ] **Step 3: Commit**

```bash
git add src/domain/agility/routing/dto/response/routing.response.ts
git commit -m "feat(cross-docking): campos de malha no RoutingResponse do app"
```

---

### Task B2: API + hook de handoff

**Files:**
- Create: `src/domain/agility/routing/dto/request/routing-handoff.request.ts`
- Modify: `src/domain/agility/routing/routingAPI.ts`
- Modify: `src/domain/agility/routing/routingService.ts`
- Create: `src/domain/agility/routing/useCase/useRoutingHandoff.ts`

**Interfaces:**
- Consumes: `apiAgility.post`, `useMutationService` (`src/api`), `MutationOptions`, `BaseResponse`.
- Produces: `routingService.handoff(id, payload)`; `useRoutingHandoff({ onSuccess?, onError? })` → `{ isLoading, handoff, isSuccess, isError }`.

- [ ] **Step 1: Request type**

Create `src/domain/agility/routing/dto/request/routing-handoff.request.ts`:
```ts
export interface RoutingHandoffProof {
    receivedBy: string
    photoProof?: string[]
    signature?: string
    notes?: string
}

export interface RoutingHandoffRequest {
    proof: RoutingHandoffProof
    /** Subconjunto do lote (futuro palete/pedido). Omitido = lote inteiro. */
    serviceIds?: string[]
}

export interface RoutingHandoffResult {
    handoffId: string
    facilityId: string
    arrivingLegRoutingId: string
    arrivedCount: number
    nextLegRoutingId?: string | null
    departedCount?: number
}
```
(Exportar via o barrel `dto/index.ts` se o repo usar um — seguir o padrão dos outros requests.)

- [ ] **Step 2: `routingAPI.handoff` + `routingService.handoff`**

Em `routingAPI.ts`, adicionar a função (mirror `acceptRouting`) e ao export block:
```ts
async function handoff(id: Id, payload: RoutingHandoffRequest): Promise<BaseResponse<RoutingHandoffResult>> {
    const { data } = await apiAgility.post<BaseResponse<RoutingHandoffResult>>(`/routings/${id}/handoff`, payload)
    return data
}
```
```ts
export const routingAPI = { /* ...existentes..., */ handoff }
```
Em `routingService.ts`, o re-export fino + export block:
```ts
async function handoff(id: Id, payload: RoutingHandoffRequest): Promise<BaseResponse<RoutingHandoffResult>> {
    return routingAPI.handoff(id, payload)
}
```
```ts
export const routingService = { /* ...existentes..., */ handoff }
```
(Importar os types `RoutingHandoffRequest`/`RoutingHandoffResult` nos dois arquivos.)

- [ ] **Step 3: Hook `useRoutingHandoff`** (mirror `useStartRouting`)

Create `src/domain/agility/routing/useCase/useRoutingHandoff.ts`:
```ts
import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { RoutingHandoffRequest, RoutingHandoffResult } from '../dto/request/routing-handoff.request'
import { routingService } from '../routingService'

export function useRoutingHandoff(options?: MutationOptions<BaseResponse<RoutingHandoffResult>>) {
    const mutation = useMutationService<RoutingHandoffResult, { id: Id; payload: RoutingHandoffRequest }>({
        action: ({ id, payload }) => routingService.handoff(id, payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        handoff: (variables: { id: Id; payload: RoutingHandoffRequest }) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}
```

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` → limpo.
```bash
git add src/domain/agility/routing
git commit -m "feat(cross-docking): API + hook useRoutingHandoff no app"
```

---

### Task B3: Tela de execução da transferência + branch na rota

**Files:**
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferLegExecution.tsx`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/index.tsx`

**Interfaces:**
- Consumes: `useRota()` (`routing`, `paradas`) do `RotaContext`; `useRoutingHandoff` (B2); `SignatureCanvas` (`@/components/SignatureCanvas`); `uploadMultipleServicePhotos`/`uploadBase64Signature` (`src/domain/agility/service/serviceUploadUtils.ts`); `expo-image-picker`; `router` (`expo-router`).

- [ ] **Step 1: Componente auto-contido `TransferLegExecution`**

Create `TransferLegExecution.tsx` — uma tela de UMA ação com estado local (não usa `ParadaContext`). Estrutura:
```tsx
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { Box, Button, ScreenBase, Text } from '@/components'
import SignatureCanvas from '@/components/SignatureCanvas'
import { uploadMultipleServicePhotos, uploadBase64Signature } from '@/domain/agility/service/serviceUploadUtils'
import { useRoutingHandoff } from '@/domain/agility/routing/useCase/useRoutingHandoff'
import { useRota } from '../_context/RotaContext'

export function TransferLegExecution() {
    const { routing, paradas } = useRota()
    const [receivedBy, setReceivedBy] = useState('')
    const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([])
    const [signature, setSignature] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)

    const { handoff } = useRoutingHandoff({
        onSuccess: () => {
            setDone(true)
            setTimeout(() => router.replace('/(auth)/(tabs)'), 2000)
        },
        onError: () => setSubmitting(false),
    })

    const canSubmit = receivedBy.trim().length > 0 && (photos.length > 0 || !!signature)

    async function onConfirm() {
        if (!routing || !canSubmit) return
        setSubmitting(true)
        const [photoUrls, signatureUrl] = await Promise.all([
            photos.length ? uploadMultipleServicePhotos(photos, routing.id).catch(() => [] as string[]) : Promise.resolve([] as string[]),
            signature ? uploadBase64Signature(signature, routing.id).catch(() => null) : Promise.resolve<string | null>(null),
        ])
        handoff({
            id: routing.id,
            payload: {
                proof: {
                    receivedBy: receivedBy.trim(),
                    photoProof: photoUrls.length ? photoUrls : undefined,
                    signature: signatureUrl ?? undefined,
                },
            },
        })
    }

    if (done) {
        return (
            <Box flex={1} backgroundColor="primary100" justifyContent="center" alignItems="center">
                <Text preset="text18" color="white" textAlign="center">Transferência concluída{'\n'}com sucesso</Text>
            </Box>
        )
    }

    // Render: cabeçalho CD origem → CD destino (routing.originFacilityName/destinationFacilityName,
    // fallback routing.name); lista `paradas` (lote, só visual); input receivedBy; foto (ImagePicker);
    // SignatureCanvas onSave={setSignature} onClear={() => setSignature(null)}; Button "Registrar entrega da carga"
    // disabled={!canSubmit || submitting} onPress={onConfirm}.
    return (
        <ScreenBase>
            {/* ...cabeçalho + lista + captura de comprovante conforme acima... */}
        </ScreenBase>
    )
}
```
> Seguir os componentes do design system do app (`Box`/`Text`/`Button`/`ScreenBase`, `measure`/`theme`), espelhando o visual de `SharedEtapaRecebedor`/`SharedEtapaFinalizacao` (input de nome, grid de fotos, canvas de assinatura). Reusar o `ImagePicker` do app da mesma forma que o fluxo de entrega. A **lista do lote** = `paradas` (título/endereço), só conferência visual.

- [ ] **Step 2: Branch na rota**

Em `rotas-detalhadas/[id]/index.tsx`, dentro de `RotaDetalhadaContent`, logo após os guards `if (loading)` / `if (error || !routing)` (linha ~353) e ANTES do `return <ScreenBase...>`:
```tsx
    if (routing.legType === 'TRANSFER') {
        return <TransferLegExecution />
    }
```
Importar `TransferLegExecution` de `./_components/TransferLegExecution`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → limpo.

- [ ] **Step 4: Smoke manual (a demo)**

Com o backend (Fase A) no ar: plataforma cria a malha + atribui o trecho de transferência ao motorista → app lista a rota ("Transferência CD X → CD Y") → abre → tela CD→CD + lote → preenche quem recebeu + foto/assinatura → "Registrar entrega da carga" → sucesso. Verificar na plataforma que a carga aparece no last-mile (custódia moveu).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]"
git commit -m "feat(cross-docking): execução de transferência de malha no app do motorista"
```

---

## Self-Review (autor do plano)

**Cobertura da spec:** §4.1 ciência de trecho → B1; §4.2 tela de execução + comprovante → B3; §4.3 endpoint driver-scoped → A1; §5 fluxo fim-a-fim → A1+B3; §6 futuro (serviceIds opcional + chavear em legType) → A1 (DTO `serviceIds?` + validação subset) e B3 (branch em `legType`); §7 erros (≥1 foto/assinatura, 403 posse, 400 sem CD destino) → A1 + B3 (`canSubmit`); §8 testes → A1 Step 6 + B3 smoke.

**Placeholders:** o corpo visual do `TransferLegExecution` (B3 Step 1) descreve o layout com o design system do app + reuso dos componentes citados — não é placeholder de lógica (a lógica de submit/upload/handoff está completa); o render é montagem de componentes existentes. O teste do controller (A1 Step 6) está como pseudocode dos casos — o implementer materializa com o harness de mock do repo.

**Consistência de tipos:** `DriverHandoffDto { proof, serviceIds? }` (A1) ↔ `RoutingHandoffRequest { proof, serviceIds? }` (B2) ↔ payload em B3; `RoutingHandoffResult` (B2) = `CustodyHandoffResponseDto` (A1). `routing.legType === 'TRANSFER'` (B3) usa o campo de B1. `handoff({ id, payload })` (hook B2) usado igual em B3.

**Gap conhecido/aceito:** o teste do controller (A1) depende do harness de mock do repo (pode virar tsc+smoke se o mock de `verifyDriverOwnership` for custoso — decisão do implementer/revisor). App = smoke manual (padrão).
