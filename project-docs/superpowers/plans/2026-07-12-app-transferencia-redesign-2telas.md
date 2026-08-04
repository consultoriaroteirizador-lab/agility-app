# App motorista — Redesign da transferência (2 telas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a tela de transferência de malha do app num fluxo de 2 telas — (1) overview com cards de CD origem/destino (casinha), mapa CD1→CD2 e lista de pedidos; (2) comprovante no padrão do last-mile (nome+documento+foto+assinatura) → handoff.

**Architecture:** Frontend-only. Adiciona `destinationFacilityId` ao `RoutingResponse` e um domínio distribution-center novo (API+hook) pra resolver as coords/endereço do CD2 (como o web faz). O `TransferLegExecution` vira host de um wizard de 2 passos, reusando `Map`+ORS (linha), `DocumentCollectionForm`/`MultiPhotoPicker`/`SignatureCanvas` (comprovante) e `useRoutingHandoff` (já existe).

**Tech Stack:** React Native + Expo Router + React Query (`lab-app`).

## Global Constraints

- **Frontend-only.** Nenhuma mudança de backend. (Nicety futuro: backend embutir coords do CD2 — não neste plano.)
- **Preservar a lógica de handoff da v1**: `useRoutingHandoff({onSuccess,onError})`, upload paralelo (`uploadMultipleServicePhotos`+`uploadBase64Signature`) → `handoff({id, payload:{proof:{receivedBy, photoProof?, signature?}}})`, gate `receivedBy && (foto||assinatura)`, success 2s → `router.replace('/(auth)/(tabs)')`.
- **`GET /distribution-centers` retorna ARRAY CRU** (sem envelope `{result}`) — o controller faz `list.map(dc => dc.toJson())`. O client do app deve tipar `DistributionCenterResponse[]` direto (NÃO `BaseResponse<...>`). VERIFICAR em runtime; se vier enveloppado, usar `.result`.
- **Casinha** só como variante ADITIVA no `Map`/marker (não quebrar last-mile). Chavear a tela por `routing.legType === 'TRANSFER'` (já feito).
- Repo tem pre-commit **`expo lint`** (passa com warnings). Não commitar o WIP do usuário.
- Gate = smoke manual (a demo).

## File Structure

**App (`lab-app`):**
- `src/domain/agility/routing/dto/response/routing.response.ts` — + `destinationFacilityId?`.
- `src/domain/agility/distribution-center/` (novo domínio): `distributionCenterAPI.ts`, `distributionCenterService.ts`, `dto/response/distribution-center.response.ts`, `dto/index.ts`, `useCase/useFindAllDistributionCenters.ts`, `useCase/index.ts`.
- `src/domain/queryKeys.ts` — + `KEY_DISTRIBUTION_CENTERS`.
- `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/CdMarker.tsx` (novo) + `Map.tsx` (variante `cd`).
- `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferLegExecution.tsx` (host do wizard).
- `.../[id]/_components/TransferOverviewStep.tsx` (novo).
- `.../[id]/_components/TransferComprovanteStep.tsx` (novo).

---

## Phase 1 — Wiring de dado

### Task 1: `destinationFacilityId` + domínio distribution-center

**Files:**
- Modify: `src/domain/agility/routing/dto/response/routing.response.ts`
- Create: `src/domain/agility/distribution-center/dto/response/distribution-center.response.ts`
- Create: `src/domain/agility/distribution-center/dto/index.ts`
- Create: `src/domain/agility/distribution-center/distributionCenterAPI.ts`
- Create: `src/domain/agility/distribution-center/distributionCenterService.ts`
- Create: `src/domain/agility/distribution-center/useCase/useFindAllDistributionCenters.ts`
- Create: `src/domain/agility/distribution-center/useCase/index.ts`
- Modify: `src/domain/queryKeys.ts`

**Interfaces:**
- Produces: `DistributionCenterResponse { id, name, code?, latitude, longitude, address?, isActive, branchId? }`; `useFindAllDistributionCenters(params?) → { distributionCenters, isLoading, ... }`; `RoutingResponse.destinationFacilityId?`. Consumido pela Task 3.

- [ ] **Step 1: `destinationFacilityId` no RoutingResponse**

Em `routing.response.ts`, junto dos campos de malha (perto de `destinationFacilityName`):
```ts
    /** Cross-docking: id do CD de destino do trecho (resolve coords via distribution-centers). */
    destinationFacilityId?: string | null
```

- [ ] **Step 2: Response DTO do CD**

Create `src/domain/agility/distribution-center/dto/response/distribution-center.response.ts`:
```ts
export interface DistributionCenterResponse {
    id: string
    name: string
    code?: string | null
    latitude: number
    longitude: number
    address?: string | null
    isActive: boolean
    branchId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
}
```
Create `src/domain/agility/distribution-center/dto/index.ts`:
```ts
export type { DistributionCenterResponse } from './response/distribution-center.response'
```

- [ ] **Step 3: queryKey**

Em `src/domain/queryKeys.ts`, adicionar:
```ts
export const KEY_DISTRIBUTION_CENTERS = 'distribution-centers'
```

- [ ] **Step 4: API client (array CRU — sem envelope)**

Create `src/domain/agility/distribution-center/distributionCenterAPI.ts`:
```ts
import { apiAgility } from '@/api/apiConfig'

import type { DistributionCenterResponse } from './dto'

export interface ListDistributionCentersParams {
    activeOnly?: boolean
    origin?: 'global' | 'branch' | 'all'
    branchId?: string
}

// GET /distribution-centers retorna um ARRAY cru (o controller faz list.map(toJson)),
// não o envelope { result }. Por isso tipamos DistributionCenterResponse[] direto.
async function findAll(params: ListDistributionCentersParams = {}): Promise<DistributionCenterResponse[]> {
    const { data } = await apiAgility.get<DistributionCenterResponse[]>('/distribution-centers', {
        params: {
            ...(params.activeOnly != null && { activeOnly: params.activeOnly }),
            ...(params.origin && { origin: params.origin }),
            ...(params.branchId && { branchId: params.branchId }),
        },
    })
    return Array.isArray(data) ? data : ((data as any)?.result ?? [])
}

export const distributionCenterAPI = { findAll }
```
> O `Array.isArray(data) ? data : data.result ?? []` cobre o gotcha: se o backend algum dia envelopar, ainda funciona.

- [ ] **Step 5: Service (re-export fino)**

Create `src/domain/agility/distribution-center/distributionCenterService.ts`:
```ts
import { distributionCenterAPI, type ListDistributionCentersParams } from './distributionCenterAPI'
import type { DistributionCenterResponse } from './dto'

async function findAll(params: ListDistributionCentersParams = {}): Promise<DistributionCenterResponse[]> {
    return distributionCenterAPI.findAll(params)
}

export const distributionCenterService = { findAll }
```

- [ ] **Step 6: Hook**

Create `src/domain/agility/distribution-center/useCase/useFindAllDistributionCenters.ts`:
```ts
import { useQuery } from '@tanstack/react-query'

import { KEY_DISTRIBUTION_CENTERS } from '@/domain/queryKeys'

import { distributionCenterService } from '../distributionCenterService'
import type { ListDistributionCentersParams } from '../distributionCenterAPI'

export function useFindAllDistributionCenters(params?: ListDistributionCentersParams, options?: { enabled?: boolean }) {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY_DISTRIBUTION_CENTERS, params?.activeOnly, params?.origin, params?.branchId],
        queryFn: () => distributionCenterService.findAll(params || {}),
        enabled: options?.enabled ?? true,
        retry: false,
    })
    return {
        distributionCenters: data ?? [],
        isLoading,
        isError,
        refetch,
    }
}
```
Create `src/domain/agility/distribution-center/useCase/index.ts`:
```ts
export { useFindAllDistributionCenters } from './useFindAllDistributionCenters'
```

- [ ] **Step 7: Typecheck + commit**

Run: `cd "C:\Users\daniel\Agility\Front\lab-app" && npx tsc --noEmit` → limpo.
```bash
git add src/domain/agility/routing/dto/response/routing.response.ts src/domain/agility/distribution-center src/domain/queryKeys.ts
git commit -m "feat(cross-docking): destinationFacilityId + domínio distribution-center no app"
```

---

## Phase 2 — Tela 1 (overview): marcador CD + mapa + cards + lista

### Task 2: Marcador de CD (casinha) + variante `cd` no `Map`

**Files:**
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/CdMarker.tsx`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/Map.tsx`

**Interfaces:**
- Produces: `MapVariant` inclui `'cd'`; um `MapPoint` com `variant:'cd'` renderiza a casinha. Consumido pela Task 3.

- [ ] **Step 1: `CdMarker` (casinha + rótulo O/D)**

Create `CdMarker.tsx` (círculo colorido com ícone de armazém do MaterialIcons + rótulo pequeno):
```tsx
import { Box, Text } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { measure } from '@/theme';

interface CdMarkerProps {
    color: string;         // cor do CD (verde origem / vermelho destino)
    label?: string | number; // 'O' | 'D'
    size?: number;
}

export function CdMarker({ color, label, size = 34 }: CdMarkerProps) {
    return (
        <Box alignItems="center">
            <Box
                width={size}
                height={size}
                borderRadius="s20"
                borderWidth={2}
                borderColor="white"
                justifyContent="center"
                alignItems="center"
                style={{ backgroundColor: color }}
            >
                <Icon name="warehouse" size={measure.m18} color="white" />
            </Box>
            {label != null && String(label).trim() !== '' ? (
                <Box marginTop="y2" paddingHorizontal="x6" borderRadius="s8" style={{ backgroundColor: color }}>
                    <Text preset="text12" color="white" fontWeightPreset="bold">{String(label)}</Text>
                </Box>
            ) : null}
        </Box>
    );
}
```
> `Icon` (MaterialIcons) tem `warehouse` no glyphMap. Se `warehouse` não existir na versão instalada, usar `home` ou `store` (todos no MaterialIcons). O `Box style={{backgroundColor: color}}` porque `color` é uma string dinâmica (não token do tema).

- [ ] **Step 2: variante `cd` no `Map`**

Em `Map.tsx`:
(a) estender o tipo `MapVariant` (linha ~17): `type MapVariant = 'coleta' | 'service' | 'entrega' | 'cd';`
(b) adicionar uma entrada `cd` no `VARIANT_CONFIG` (linha ~80) espelhando as outras (`markerColor`/`borderColor`/`label`) — ex.: `cd: { markerColor: 'primary100', borderColor: 'white', label: '' }`.
(c) no bloco de render dos pinos (linha ~397-412), quando `point.variant === 'cd'`, renderizar `<CdMarker color={pinColor} label={pinLabel} size={point.size} />` em vez de `<StopMarker .../>`:
```tsx
    <MapLibreGL.PointAnnotation key={point.id} id={point.id} coordinate={[point.longitude, point.latitude]} title={point.title || `Ponto ${index + 1}`} anchor={{ x: 0.5, y: 1 }}>
        {point.variant === 'cd'
            ? <CdMarker color={pinColor} label={point.label} size={point.size} />
            : <StopMarker color={pinColor} label={pinLabel} size={point.size} />}
    </MapLibreGL.PointAnnotation>
```
Importar `CdMarker`. NÃO mudar o comportamento das variantes existentes.

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` → limpo.
```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/CdMarker.tsx" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/Map.tsx"
git commit -m "feat(cross-docking): marcador de CD (casinha) + variante cd no Map"
```

---

### Task 3: Wizard host (2 passos) + `TransferOverviewStep`

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferLegExecution.tsx` (vira host)
- Create: `.../[id]/_components/TransferOverviewStep.tsx`

**Interfaces:**
- Consumes: `useRota()` (`routing`,`paradas`), `useGetRoutingMapData` (CD1), `useFindAllDistributionCenters` (CD2), `useRouteDirections` (linha), `Map`/`MapPoint` (Task 2). Produces: host com `step: 'overview'|'comprovante'` passado ao `TransferComprovanteStep` (Task 4).

- [ ] **Step 1: `TransferOverviewStep`**

Create `TransferOverviewStep.tsx`:
```tsx
import { useMemo } from 'react';

import { Box, Text } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { Map, type MapPoint } from './..'; // ver nota de import abaixo
import { useFindAllDistributionCenters } from '@/domain/agility/distribution-center/useCase';
import { useGetRoutingMapData } from '@/domain/agility/routing/useCase/useGetRoutingMapData';
import { useRouteDirections } from '@/domain/ors/useRouteDirections';
import { measure } from '@/theme';
import { useRota } from '../_context/RotaContext';

const ORIGIN_COLOR = '#10B981';
const DEST_COLOR = '#EF4444';

export function TransferOverviewStep({ onArrived }: { onArrived: () => void }) {
    const { routing, paradas } = useRota();
    const { origin } = useGetRoutingMapData(routing?.id ?? '');
    const { distributionCenters } = useFindAllDistributionCenters(
        { activeOnly: true },
        { enabled: !!routing?.destinationFacilityId },
    );

    const cd2 = useMemo(
        () => (routing?.destinationFacilityId ? distributionCenters.find((c) => c.id === routing.destinationFacilityId) : undefined),
        [distributionCenters, routing?.destinationFacilityId],
    );

    const cd1Coords = origin?.latitude != null && origin?.longitude != null
        ? { latitude: origin.latitude, longitude: origin.longitude } : null;
    const cd2Coords = cd2 ? { latitude: cd2.latitude, longitude: cd2.longitude } : null;

    const roadGeometry = useRouteDirections(cd1Coords, cd2Coords);

    const points: MapPoint[] = [
        ...(cd1Coords ? [{ id: 'cd1', latitude: cd1Coords.latitude, longitude: cd1Coords.longitude, variant: 'cd' as const, label: 'O', color: ORIGIN_COLOR }] : []),
        ...(cd2Coords ? [{ id: 'cd2', latitude: cd2Coords.latitude, longitude: cd2Coords.longitude, variant: 'cd' as const, label: 'D', color: DEST_COLOR }] : []),
    ];
    const coordinateSegments = !roadGeometry && cd1Coords && cd2Coords
        ? [[[cd1Coords.longitude, cd1Coords.latitude], [cd2Coords.longitude, cd2Coords.latitude]]]
        : undefined;

    const origemNome = routing?.originFacilityName || 'CD de origem';
    const origemEndereco = origin?.address || '';
    const destinoNome = routing?.destinationFacilityName || cd2?.name || 'CD de destino';
    const destinoEndereco = cd2?.address || '';

    const cdCard = (label: string, nome: string, endereco: string, color: string) => (
        <Box backgroundColor="gray50" borderRadius="s12" borderWidth={1} borderColor="gray200" p="y12" gap="y4" flexDirection="row" alignItems="flex-start">
            <Box width={measure.m36} height={measure.m36} borderRadius="s20" justifyContent="center" alignItems="center" style={{ backgroundColor: color }}>
                <Icon name="warehouse" size={measure.m20} color="white" />
            </Box>
            <Box flex={1} marginLeft="x12">
                <Text preset="text12" color="gray600">{label}</Text>
                <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary">{nome}</Text>
                {endereco ? <Text preset="text13" color="gray700" marginTop="y4">{endereco}</Text> : null}
            </Box>
        </Box>
    );

    return (
        <Box gap="y16">
            {cdCard('Origem', origemNome, origemEndereco, ORIGIN_COLOR)}
            {cdCard('Destino', destinoNome, destinoEndereco, DEST_COLOR)}

            {points.length > 0 ? (
                <Box borderRadius="s12" overflow="hidden">
                    <Map height={measure.y220} points={points} geometries={roadGeometry ? [roadGeometry] : undefined} coordinateSegments={coordinateSegments} routeColor={DEST_COLOR} routeWidth={4} showNavigationButton={false} />
                </Box>
            ) : null}

            <Box gap="y8">
                <Text preset="text14" fontWeightPreset="bold" color="gray600">
                    Lote da carga ({paradas.length} pedido{paradas.length === 1 ? '' : 's'})
                </Text>
                {paradas.map((parada) => (
                    <Box key={parada.serviceId} flexDirection="row" alignItems="center" gap="x12" backgroundColor="white" p="y12" borderRadius="s12" borderWidth={1} borderColor="gray200">
                        <Icon name="inventory-2" size={measure.m20} color="gray400" />
                        <Box flex={1}>
                            <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">{parada.nome}</Text>
                            <Text preset="text12" color="gray600">{parada.endereco}</Text>
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );
    // `onArrived` é usado pelo host (botão CTA) — veja Step 2.
}
```
> **Imports a verificar:** `Map`/`MapPoint` vêm de `.../parada/[pid]/_components/shared/Map` — usar o caminho relativo REAL (o `TransferOverviewStep` está em `[id]/_components/`, então o path é `./parada/[pid]/_components/shared/Map` ou um alias `@/...`; confirmar). `MapPoint` é exportado de `Map.tsx`. `useRouteDirections` de `@/domain/ors/useRouteDirections`. Ícones MaterialIcons: `warehouse`, `inventory-2` (ou `box`/`inventory` se não existir — verificar no glyphMap). O botão CTA "Cheguei no CD de destino" fica no **host** (Step 2), não aqui — o `onArrived` é passado adiante se preferir o botão dentro do step; ajuste conforme o layout do host.

- [ ] **Step 2: `TransferLegExecution` vira host de wizard**

Reescrever `TransferLegExecution.tsx` como host: mantém `useRota()`, os guards (loading/`!routing`), o `ScreenBase` com `ButtonBack`+title. Estado `const [step, setStep] = useState<'overview'|'comprovante'>('overview')`. Renderiza:
- `step === 'overview'`: `<TransferOverviewStep />` + botão CTA **"Cheguei no CD de destino"** (`onPress={() => setStep('comprovante')}`).
- `step === 'comprovante'`: `<TransferComprovanteStep routingId={routing.id} onBack={() => setStep('overview')} />` (Task 4).
**Mover** toda a lógica de comprovante/handoff atual (receivedBy/photos/signature/`useRoutingHandoff`/`onConfirm`/`done`) para o `TransferComprovanteStep` na Task 4 — nesta task o `step==='comprovante'` pode renderizar um placeholder `<Text>` temporário SE a Task 4 vier depois; mas como as tasks são sequenciais, é aceitável já deixar o host chamando `<TransferComprovanteStep/>` e criar o arquivo na Task 4. Para manter a Task 3 verde no tsc, criar um stub mínimo de `TransferComprovanteStep` aqui (só a assinatura), completado na Task 4. **Decisão:** criar o stub nesta task.

Stub `TransferComprovanteStep.tsx` (mínimo, tsc-verde):
```tsx
import { Box, Text } from '@/components';
export function TransferComprovanteStep(_: { routingId: string; onBack: () => void }) {
    return <Box><Text>Comprovante</Text></Box>;
}
```

- [ ] **Step 3: Typecheck + smoke + commit**

Run: `npx tsc --noEmit` → limpo. Smoke: abrir trecho de transferência → Tela 1 com 2 cards de CD (casinha), mapa CD1→CD2, lista → botão "Cheguei no CD de destino" leva ao passo comprovante (stub por ora).
```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components"
git commit -m "feat(cross-docking): tela 1 (overview) da transferência — CDs + mapa + lote"
```

---

## Phase 3 — Tela 2 (comprovante)

### Task 4: `TransferComprovanteStep` (padrão last-mile) + handoff

**Files:**
- Modify: `.../[id]/_components/TransferComprovanteStep.tsx` (do stub → completo)

**Interfaces:**
- Consumes: `DocumentCollectionForm`/`DocumentData` (`@/components/DocumentCollectionForm`), `MultiPhotoPicker`, `SignatureCanvas`, `uploadMultipleServicePhotos`/`uploadBase64Signature`, `useRoutingHandoff`, `useRota` (paradas p/ recap). Props: `{ routingId: string; onBack: () => void }`.

- [ ] **Step 1: Implementar o comprovante (preserva a lógica da v1, usa DocumentCollectionForm)**

Substituir o stub por:
```tsx
import { useState } from 'react';

import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { Box, Button, LocalIcon, Text } from '@/components';
import { DocumentCollectionForm, type DocumentData } from '@/components/DocumentCollectionForm';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { useRoutingHandoff } from '@/domain/agility/routing/useCase/useRoutingHandoff';
import { uploadBase64Signature, uploadMultipleServicePhotos } from '@/domain/agility/service/serviceUploadUtils';
import { measure } from '@/theme';

import { useRota } from '../_context/RotaContext';

export function TransferComprovanteStep({ routingId, onBack }: { routingId: string; onBack: () => void }) {
    const { paradas } = useRota();
    const [doc, setDoc] = useState<DocumentData>({ recipientName: '', documentType: 'RG', documentNumber: '' });
    const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [signature, setSignature] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const { handoff } = useRoutingHandoff({
        onSuccess: () => { setDone(true); setTimeout(() => router.replace('/(auth)/(tabs)'), 2000); },
        onError: () => setSubmitting(false),
    });

    const canSubmit = doc.recipientName.trim().length > 0 && (photos.length > 0 || !!signature);

    async function onConfirm() {
        if (!canSubmit || submitting) return;
        setSubmitting(true);
        const [photoUrls, signatureUrl] = await Promise.all([
            photos.length ? uploadMultipleServicePhotos(photos, routingId).catch(() => [] as string[]) : Promise.resolve([] as string[]),
            signature ? uploadBase64Signature(signature, routingId).catch(() => null) : Promise.resolve<string | null>(null),
        ]);
        const docNote = doc.documentNumber.trim() ? `${doc.documentType}: ${doc.documentNumber.trim()}` : undefined;
        handoff({
            id: routingId,
            payload: { proof: { receivedBy: doc.recipientName.trim(), photoProof: photoUrls.length ? photoUrls : undefined, signature: signatureUrl ?? undefined, notes: docNote } },
        });
    }

    if (done) {
        return (
            <Box flex={1} backgroundColor="primary100" justifyContent="center" alignItems="center" px="x24">
                <LocalIcon iconName="check" size={measure.m40} color="white" />
                <Text preset="text18" color="white" textAlign="center" mt="y16">Transferência concluída{'\n'}com sucesso</Text>
            </Box>
        );
    }

    return (
        <Box gap="y16">
            <Box backgroundColor="secondary10" p="y12" borderRadius="s12">
                <Text preset="text13" color="gray700">Confirme o recebimento do lote ({paradas.length} pedido{paradas.length === 1 ? '' : 's'}) no CD de destino.</Text>
            </Box>

            <DocumentCollectionForm data={doc} onChange={setDoc} />

            <MultiPhotoPicker photos={photos} onPhotosChange={setPhotos} label="Foto da carga (opcional se houver assinatura)" maxPhotos={5} allowCamera />

            <Box>
                <Text preset="text12" color="gray600" mb="b4">Assinatura (opcional se houver foto)</Text>
                <SignatureCanvas onSave={setSignature} onClear={() => setSignature(null)} height={measure.y200} penColor="black" backgroundColor="white" />
                {signature ? <Text preset="text12" color="primary100" mt="t4">Assinatura registrada.</Text> : null}
            </Box>

            <Box gap="y12" pb="y24">
                <Button title="Registrar entrega da carga" onPress={onConfirm} disabled={!canSubmit || submitting} isLoading={submitting} />
                {!canSubmit ? <Text preset="text12" color="gray500" textAlign="center">* Informe quem recebeu e anexe uma foto ou assinatura.</Text> : null}
                <Button title="Voltar" onPress={onBack} preset="outline" />
            </Box>
        </Box>
    );
}
```
> `Button preset="outline"` — confirmar o preset real de botão secundário do app (pode ser `secondary`/`ghost`); usar o que existir. O documento entra como `notes` no proof (o backend não tem campo de documento estruturado no handoff — vai como nota; se preferir omitir, remover `docNote`).

- [ ] **Step 2: Typecheck + smoke + commit**

Run: `npx tsc --noEmit` → limpo. Smoke completo: overview → "Cheguei no CD de destino" → comprovante (nome+doc+foto+assinatura) → "Registrar entrega da carga" → sucesso → carga aparece no last-mile (com backend #325 deployado).
```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferComprovanteStep.tsx"
git commit -m "feat(cross-docking): tela 2 (comprovante) da transferência — dados + foto + assinatura + handoff"
```

---

## Self-Review (autor do plano)

**Cobertura da spec:** §4.1 wiring (destinationFacilityId + domínio DC) → Task 1; §4.2 mapa + casinha → Task 2 + Task 3; §4.3 Tela 1 (cards CD + mapa + lista) → Task 3; §4.4 Tela 2 (comprovante) → Task 4; §4.5 host wizard → Task 3. §6 erros (CD2 não resolve → só nome/CD1; ORS falha → reta) → Task 3 (guards de coords). §9 faseamento = as 3 fases.

**Placeholders:** os "verificar o path real do import"/"confirmar o preset de botão"/"confirmar o glyph do ícone" referem-se a APIs existentes do app cujo nome exato o implementer confirma ao ler — não são placeholders de lógica (todo o código de dado/handoff/render está completo). O gotcha do array-cru do DC está tratado com fallback.

**Consistência de tipos:** `DistributionCenterResponse` (Task 1) usado no `cdById` (Task 3); `useFindAllDistributionCenters` (Task 1) → Task 3; `MapPoint`/variante `cd` (Task 2) → Task 3; `useRoutingHandoff({id,payload:{proof}})` (v1) preservado na Task 4; `DocumentData` (DocumentCollectionForm) → proof.receivedBy/notes na Task 4. O `TransferComprovanteStep` é stub na Task 3 e completado na Task 4 (mesma assinatura `{routingId, onBack}`).

**Gap conhecido/aceito:** `MapVariant` ganha `'cd'` — toca o `Map.tsx` compartilhado (aditivo, não muda last-mile). O documento vai como `notes` no handoff (backend não tem campo estruturado). Gate do app = smoke manual.
