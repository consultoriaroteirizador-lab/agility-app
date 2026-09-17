# Tentativas de entrega — Parte 2 (app do motorista) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fazer o motorista fechar a devolução pelo app — checklist de retorno completo, CD e recebedor da devolução, histórico de tentativas na parada e GPS na ocorrência —, destravando o `returnSource = RETURN_STOP` que hoje nunca dispara.

**Architecture:** toda a lógica nova sai das telas para funções puras em `_utils`, testadas com jest; as telas só chamam. Dois retoques pequenos e independentes no backend (`agility-services`) acompanham: expor `maxAttempts` na leitura das tentativas e recusar `FAILED` por `PUT /status`/`PATCH`.

**Tech Stack:** React Native + Expo Router, TanStack Query, jest (app); NestJS + Prisma, jest (backend).

**Spec:** `project-docs/superpowers/specs/2026-09-17-tentativas-de-entrega-parte2-app-design.md` (lab-app#51)

## Global Constraints

- **Repositórios:** Tarefas 1, 3, 4, 5, 6 e 7 em `lab-app` (`C:\Users\daniel\Agility\Front\lab-app`). Tarefas 2 e 8 em `agility-services` (`C:\Users\daniel\Agility\Front\agility-services`), branch a partir de `origin/development`.
- **Base das branches:** `lab-app` → `origin/main` (este repo **não tem** `development`). `agility-services` → `origin/development`.
- **Mensagens de commit sem acentuação**, seguindo o histórico do repo (ex.: `fix(retorno): manda todo pedido falhado no checklist`).
- **Rodar teste no app:** `npx jest <caminho> --watchAll=false` (o script `npm test` entra em modo watch).
- **Rodar teste no backend:** `npm test -- <caminho>`.
- **Nada de campo obrigatório novo:** `returnFacilityId` e `receivedBy` são opcionais; app antigo em campo continua funcionando.
- **O motorista nunca é bloqueado por GPS.** `getCurrentCoords()` é best-effort e já tem timeout de 5 s.
- **Não renderizar `driverName` nem `failedBy.name`** em nenhuma tela do app (D1 da spec).

## Divergências medidas no código (correções à spec)

1. **`ServicePointResponse` não tem `code`.** A spec propôs `material: p.code ?? 'Pedido devolvido'` para o cartão de pedido sem manifesto. O tipo que a tela recebe (`routing-map-data.response.ts:6`) só tem `id`, `sequenceOrder`, `latitude`, `longitude`, `title`, `serviceType`, `status`, `custodyPhase`. **Usar `title`**; `serviceCode` vai `null`.
2. **Não existe `delivery-attempt.mapper.spec.ts`** no backend — a Tarefa 2 cria o arquivo.
3. A tela de retorno **não** carrega a rota hoje (só `map-data` e manifesto). A Tarefa 5 introduz `useFindOneRouting`, e a Tarefa 6 reaproveita.

---

### Task 1: Checklist de retorno leva todo pedido falhado (F2)

Hoje o `returnChecklist` sai só do manifesto; os cartões de pedido `FAILED` sem linha de manifesto são exibidos, travam o botão e nunca são enviados — então a tentativa deles nunca fecha por `RETURN_STOP`.

**Files:**
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/returnChecklist.ts`
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/returnChecklist.test.ts`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/retorno/index.tsx:255-268` (montagem do checklist dentro de `handleConcluirRetorno`)

**Interfaces:**
- Consumes: `ReturnManifestItem` de `@/domain/agility/routing/routingAPI`; `ReturnChecklistItem` de `@/domain/agility/service/dto/request/service-completion-details.request`; `ServicePointResponse` de `@/domain/agility/routing/dto`.
- Produces: `montarReturnChecklist(params: MontarReturnChecklistParams): ReturnChecklistItem[]` — usada só pela tela de retorno.

- [ ] **Step 1: Write the failing test**

Criar `_utils/__tests__/returnChecklist.test.ts`:

```ts
import type { ReturnManifestItem } from '@/domain/agility/routing/routingAPI'
import type { ServicePointResponse } from '@/domain/agility/routing/dto'

import { montarReturnChecklist } from '../returnChecklist'

function makeItem(over: Partial<ReturnManifestItem> & { serviceId: string }): ReturnManifestItem {
    return {
        material: 'Caixa 10kg',
        sku: null,
        unit: 'un',
        quantity: 3,
        origin: 'UNDELIVERED',
        reason: 'FAILED',
        serviceCode: 'COD-1',
        ...over,
    }
}

function makePedido(over: Partial<ServicePointResponse> & { id: string }): ServicePointResponse {
    return {
        sequenceOrder: 1,
        latitude: -23.5,
        longitude: -46.6,
        title: 'Pedido TRA-1',
        serviceType: 'DELIVERY',
        status: 'FAILED',
        ...over,
    } as ServicePointResponse
}

describe('montarReturnChecklist', () => {
    it('mantem os itens do manifesto com a quantidade recebida e o check', () => {
        const result = montarReturnChecklist({
            items: [makeItem({ serviceId: 's-1' })],
            conferred: { 0: true },
            receivedQty: () => 2,
            pedidosVolta: [],
            pedidoConferred: {},
        })

        expect(result).toEqual([
            {
                material: 'Caixa 10kg',
                serviceId: 's-1',
                serviceCode: 'COD-1',
                quantity: 3,
                unit: 'un',
                origin: 'UNDELIVERED',
                reason: 'FAILED',
                received: 2,
                checked: true,
            },
        ])
    })

    it('acrescenta o pedido sem linha de manifesto com quantidade zero e material do titulo', () => {
        const result = montarReturnChecklist({
            items: [],
            conferred: {},
            receivedQty: () => 0,
            pedidosVolta: [makePedido({ id: 's-2' })],
            pedidoConferred: { 's-2': true },
        })

        expect(result).toEqual([
            {
                material: 'Pedido TRA-1',
                serviceId: 's-2',
                serviceCode: null,
                quantity: 0,
                unit: null,
                origin: 'UNDELIVERED',
                reason: 'FAILED',
                received: 0,
                checked: true,
            },
        ])
    })

    it('usa um rotulo padrao quando o pedido nao tem titulo', () => {
        const result = montarReturnChecklist({
            items: [],
            conferred: {},
            receivedQty: () => 0,
            pedidosVolta: [makePedido({ id: 's-3', title: null })],
            pedidoConferred: {},
        })

        expect(result[0].material).toBe('Pedido devolvido')
    })

    it('manda o pedido nao conferido com checked false (o backend ignora)', () => {
        const result = montarReturnChecklist({
            items: [],
            conferred: {},
            receivedQty: () => 0,
            pedidosVolta: [makePedido({ id: 's-4' })],
            pedidoConferred: {},
        })

        expect(result[0].checked).toBe(false)
    })

    it('nao duplica pedido que ja aparece no manifesto', () => {
        const result = montarReturnChecklist({
            items: [makeItem({ serviceId: 's-5' })],
            conferred: { 0: true },
            receivedQty: () => 3,
            pedidosVolta: [makePedido({ id: 's-5' })],
            pedidoConferred: { 's-5': true },
        })

        expect(result).toHaveLength(1)
        expect(result[0].material).toBe('Caixa 10kg')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/returnChecklist.test.ts" --watchAll=false`
Expected: FAIL — `Cannot find module '../returnChecklist'`.

- [ ] **Step 3: Write minimal implementation**

Criar `_utils/returnChecklist.ts`:

```ts
/**
 * Montagem do checklist enviado na conclusão da parada de RETORNO.
 *
 * A lista tem DUAS origens e o backend fecha a tentativa de devolução por ela
 * (`returnedServiceIds` → `resolveReturnedAttempts`, com `returnSource = RETURN_STOP`):
 * os itens do manifesto (materiais) e os pedidos FALHADOS que não têm linha de
 * manifesto — estes últimos a tela já exibia e travava, mas nunca enviava, e por
 * isso a tentativa deles ficava aguardando a central.
 *
 * O pedido sem manifesto vai com `quantity: 0` e `received: 0`: é exatamente o
 * caso que `isReturnedChecklistItem` trata como devolvido quando `checked` é
 * verdadeiro (`!(quantity > 0)`). `material` NÃO pode ser vazio — o DTO do
 * backend o valida com `@IsNotEmpty()`.
 *
 * @module rotas-detalhadas/parada/utils/returnChecklist
 */

import type { ServicePointResponse } from '@/domain/agility/routing/dto'
import type { ReturnManifestItem } from '@/domain/agility/routing/routingAPI'
import type { ReturnChecklistItem } from '@/domain/agility/service/dto/request/service-completion-details.request'

export interface MontarReturnChecklistParams {
    /** Itens do manifesto de retorno, na ordem em que a tela os renderiza. */
    items: ReturnManifestItem[]
    /** Check de cada item do manifesto, pelo ÍNDICE (é assim que a tela guarda). */
    conferred: Record<number, boolean>
    /** Quantidade recebida já clampada em [0, esperado]. */
    receivedQty: (idx: number, expected: number) => number
    /** Pedidos FALHADOS da rota sem linha de manifesto. */
    pedidosVolta: ServicePointResponse[]
    /** Check dos cartões de pedido, por id do pedido. */
    pedidoConferred: Record<string, boolean>
}

/** Rótulo do cartão sem manifesto. `ServicePointResponse` não traz código. */
const ROTULO_PEDIDO_SEM_MANIFESTO = 'Pedido devolvido'

export function montarReturnChecklist({
    items,
    conferred,
    receivedQty,
    pedidosVolta,
    pedidoConferred,
}: MontarReturnChecklistParams): ReturnChecklistItem[] {
    const checklist: ReturnChecklistItem[] = items.map((item, idx) => ({
        material: item.material,
        serviceId: item.serviceId,
        serviceCode: item.serviceCode,
        quantity: item.quantity,
        unit: item.unit,
        origin: item.origin,
        reason: item.reason,
        received: receivedQty(idx, Number(item.quantity ?? 0)),
        checked: !!conferred[idx],
    }))

    const jaNoChecklist = new Set(checklist.map((i) => i.serviceId))

    for (const pedido of pedidosVolta) {
        if (!pedido?.id || jaNoChecklist.has(pedido.id)) continue
        jaNoChecklist.add(pedido.id)
        checklist.push({
            material: pedido.title || ROTULO_PEDIDO_SEM_MANIFESTO,
            serviceId: pedido.id,
            serviceCode: null,
            quantity: 0,
            unit: null,
            origin: 'UNDELIVERED',
            reason: 'FAILED',
            received: 0,
            checked: !!pedidoConferred[pedido.id],
        })
    }

    return checklist
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/returnChecklist.test.ts" --watchAll=false`
Expected: PASS (5 testes).

- [ ] **Step 5: Wire the screen**

Em `retorno/index.tsx`, trocar o bloco que monta o checklist dentro de `handleConcluirRetorno` (hoje `const returnChecklist: ReturnChecklistItem[] = items.map((item, idx) => ({ ... }))`) por:

```ts
      const returnChecklist = montarReturnChecklist({
        items,
        conferred,
        receivedQty,
        pedidosVolta,
        pedidoConferred,
      });
```

Acrescentar o import (grupo de imports relativos, junto de `getCurrentCoords`):

```ts
import { montarReturnChecklist } from '../_utils/returnChecklist';
```

Acrescentar `pedidosVolta` e `pedidoConferred` ao array de dependências do `useCallback` do `handleConcluirRetorno`. O import de tipo `ReturnChecklistItem` fica sem uso na tela — remover a linha `import type { ReturnChecklistItem } from '@/domain/agility/service/dto/request/service-completion-details.request';`.

- [ ] **Step 6: Run lint and typecheck**

Run: `npm run lint` e `npx tsc --noEmit`
Expected: sem erros novos (o lint do repo termina com warnings pré-existentes e 0 errors).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/returnChecklist.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/returnChecklist.test.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/retorno/index.tsx"
git commit -m "fix(retorno): manda todo pedido falhado no checklist de devolucao"
```

---

### Task 2: `maxAttempts` na leitura das tentativas (B1, backend)

O valor é congelado na falha e gravado na tabela, mas `DeliveryAttemptJson` não o declara — `GET /services/:id/attempts` devolve `undefined`. Sem ele o app só consegue dizer "2ª tentativa", nunca "2 de 3".

**Repo:** `agility-services`, branch a partir de `origin/development`.

**Files:**
- Modify: `src/service/delivery-attempt/delivery-attempt.mapper.ts` (interface `DeliveryAttemptJson` e função `toAttemptJson`)
- Create: `src/service/delivery-attempt/delivery-attempt.mapper.spec.ts`

**Interfaces:**
- Produces: `DeliveryAttemptJson.maxAttempts: number` — consumido pela Tarefa 3 (app) e, depois, pela Parte 3 (web).

- [ ] **Step 1: Write the failing test**

Criar `src/service/delivery-attempt/delivery-attempt.mapper.spec.ts`:

```ts
import { DeliveryAttemptRow, toAttemptJson } from './delivery-attempt.mapper';

function makeRow(over: Partial<DeliveryAttemptRow> = {}): DeliveryAttemptRow {
    return {
        id: 'att-1',
        companyId: 'company-1',
        branchId: null,
        serviceId: 'svc-1',
        attemptNumber: 2,
        routingId: 'rt-1',
        routingCode: 'ABC1234',
        driverId: 'drv-1',
        driverName: 'Motorista',
        vehicleId: null,
        failedAt: new Date('2026-09-17T12:00:00.000Z'),
        failedById: 'usr-1',
        failedByType: 'COLLABORATOR',
        failedByName: 'Operador',
        source: 'OCCURRENCE',
        occurrenceReasonId: 'rsn-1',
        reasonName: 'Cliente ausente',
        sideEffect: 'RETURN_TO_POOL',
        rescheduleOffsetDays: 1,
        rescheduleBusinessDays: false,
        maxAttempts: 3,
        failureReason: null,
        notes: null,
        photoProof: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        outcome: 'AWAITING_RETURN',
        returnedAt: null,
        returnSource: null,
        returnedById: null,
        returnedByType: null,
        receivedBy: null,
        returnedFacilityId: null,
        custodyHandoffId: null,
        createdAt: new Date('2026-09-17T12:00:00.000Z'),
        updatedAt: new Date('2026-09-17T12:00:00.000Z'),
        ...over,
    } as unknown as DeliveryAttemptRow;
}

describe('toAttemptJson', () => {
    it('expõe o limite congelado na tentativa (app e web mostram "2 de 3")', () => {
        expect(toAttemptJson(makeRow()).maxAttempts).toBe(3);
    });

    it('mantém o número da tentativa junto do limite', () => {
        const json = toAttemptJson(makeRow({ attemptNumber: 1, maxAttempts: 5 } as Partial<DeliveryAttemptRow>));
        expect(json.attemptNumber).toBe(1);
        expect(json.maxAttempts).toBe(5);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/service/delivery-attempt/delivery-attempt.mapper.spec.ts`
Expected: FAIL — `Property 'maxAttempts' does not exist on type 'DeliveryAttemptJson'`.

- [ ] **Step 3: Write minimal implementation**

Em `delivery-attempt.mapper.ts`, na interface `DeliveryAttemptJson`, logo abaixo de `attemptNumber: number;`:

```ts
    /**
     * Limite de tentativas congelado na falha (`Company.params.delivery.
     * maxRedeliveryAttempts` da época). É o valor que decide o desfecho da
     * devolução, então é ele — e não o parâmetro atual — que o app e a web
     * mostram em "tentativa 2 de 3".
     */
    maxAttempts: number;
```

E em `toAttemptJson`, logo abaixo de `attemptNumber: row.attemptNumber,`:

```ts
        maxAttempts: row.maxAttempts,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/service/delivery-attempt/delivery-attempt.mapper.spec.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/service/delivery-attempt/delivery-attempt.mapper.ts src/service/delivery-attempt/delivery-attempt.mapper.spec.ts
git commit -m "feat(tentativas): expoe maxAttempts na leitura das tentativas"
```

---

### Task 3: Leitura das tentativas no app (F5, camada de dados)

**Files:**
- Create: `src/domain/agility/service/dto/response/delivery-attempt.response.ts`
- Modify: `src/domain/agility/service/dto/index.ts` (export do tipo novo)
- Modify: `src/domain/agility/service/serviceAPI.ts` (função `findAttempts` + entrada no objeto exportado)
- Modify: `src/domain/agility/service/serviceService.ts` (repasse)
- Create: `src/domain/agility/service/useCase/useFindServiceAttempts.ts`
- Modify: `src/domain/agility/service/useCase/index.ts` (export)
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/attemptLabels.ts`
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/attemptLabels.test.ts`

**Interfaces:**
- Consumes: `maxAttempts` da Tarefa 2 (opcional no tipo — o app funciona sem ele).
- Produces: `useFindServiceAttempts(serviceId)` → `{ attempts: DeliveryAttemptResponse[], isLoading, isError, refetch }`; `outcomeTentativaLabel(outcome)` e `tentativaTitulo(attemptNumber, maxAttempts)` — consumidos pela Tarefa 4.

- [ ] **Step 1: Write the failing test**

Criar `_utils/__tests__/attemptLabels.test.ts`:

```ts
import { outcomeTentativaLabel, tentativaTitulo } from '../attemptLabels'

describe('outcomeTentativaLabel', () => {
    it('mapeia os tres desfechos', () => {
        expect(outcomeTentativaLabel('AWAITING_RETURN')).toBe('Aguardando devolucao ao CD')
        expect(outcomeTentativaLabel('REQUEUED')).toBe('Voltou para a fila')
        expect(outcomeTentativaLabel('FAILED_FINAL')).toBe('Insucesso definitivo')
    })

    it('cai no rotulo neutro para valor desconhecido ou ausente', () => {
        expect(outcomeTentativaLabel(null)).toBe('Tentativa registrada')
        expect(outcomeTentativaLabel('QUALQUER_COISA')).toBe('Tentativa registrada')
    })
})

describe('tentativaTitulo', () => {
    it('mostra o limite quando o backend o envia', () => {
        expect(tentativaTitulo(2, 3)).toBe('2a tentativa de 3')
    })

    it('omite o limite quando o backend nao envia (app novo x backend antigo)', () => {
        expect(tentativaTitulo(2, undefined)).toBe('2a tentativa')
        expect(tentativaTitulo(2, 0)).toBe('2a tentativa')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/attemptLabels.test.ts" --watchAll=false`
Expected: FAIL — `Cannot find module '../attemptLabels'`.

- [ ] **Step 3: Write minimal implementation**

Criar `_utils/attemptLabels.ts`:

```ts
/**
 * Rótulos das tentativas de entrega exibidas na parada.
 *
 * Mapa exaustivo com fallback: o backend valida os desfechos por CHECK no banco
 * (`ATTEMPT_OUTCOMES`), mas um valor novo não pode quebrar a tela do motorista.
 *
 * @module rotas-detalhadas/parada/utils/attemptLabels
 */

/** Desfecho da tentativa, como o backend o envia. */
export type AttemptOutcome = 'AWAITING_RETURN' | 'REQUEUED' | 'FAILED_FINAL'

export function outcomeTentativaLabel(outcome: string | null | undefined): string {
    switch (outcome) {
        case 'AWAITING_RETURN':
            return 'Aguardando devolucao ao CD'
        case 'REQUEUED':
            return 'Voltou para a fila'
        case 'FAILED_FINAL':
            return 'Insucesso definitivo'
        default:
            return 'Tentativa registrada'
    }
}

/**
 * "2a tentativa de 3". O limite só aparece quando o backend o envia — versão
 * anterior à #B1 devolve `maxAttempts` indefinido, e "de undefined" na tela do
 * motorista seria pior que a ordem sozinha.
 */
export function tentativaTitulo(attemptNumber: number, maxAttempts?: number | null): string {
    const base = `${attemptNumber}a tentativa`
    return maxAttempts && maxAttempts > 0 ? `${base} de ${maxAttempts}` : base
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/attemptLabels.test.ts" --watchAll=false`
Expected: PASS (4 testes).

- [ ] **Step 5: Create the response DTO**

Criar `src/domain/agility/service/dto/response/delivery-attempt.response.ts`:

```ts
/**
 * Uma tentativa de entrega (GET /services/:id/attempts).
 *
 * A resposta do backend traz MAIS campos do que os declarados aqui — entre eles
 * `driverName` e `failedBy`, que o app NÃO exibe por decisão de produto (D1 da
 * spec da Parte 2): o motorista vê o que houve na porta, não quem tentou.
 * Declarar só o que a tela usa deixa essa decisão visível no tipo.
 */
export interface DeliveryAttemptResponse {
    id: string
    /** 1, 2, 3... na ordem das tentativas do pedido. */
    attemptNumber: number
    /** Limite congelado na falha. Ausente em backend anterior à exposição do campo. */
    maxAttempts?: number | null
    /** ISO. Quando a falha foi registrada. */
    failedAt: string
    /** Nome do motivo do catálogo, congelado. */
    reasonName: string | null
    /** Observação escrita pelo motorista. */
    notes: string | null
    /** URLs das fotos anexadas à ocorrência. */
    photoProof: string[]
    /** Desfecho: AWAITING_RETURN | REQUEUED | FAILED_FINAL. */
    outcome: string
    /** ISO da devolução, quando já fechada. */
    returnedAt: string | null
    /** Nome do CD onde a mercadoria foi devolvida, quando houver. */
    returnedFacilityName: string | null
}
```

Em `src/domain/agility/service/dto/index.ts`, acrescentar:

```ts
export type { DeliveryAttemptResponse } from './response/delivery-attempt.response'
```

- [ ] **Step 6: Wire API, service and hook**

Em `serviceAPI.ts`, ao lado de `applyOccurrence`:

```ts
async function findAttempts(id: Id): Promise<BaseResponse<DeliveryAttemptResponse[]>> {
    const { data } = await apiAgility.get<BaseResponse<DeliveryAttemptResponse[]>>(`/services/${id}/attempts`)
    return data
}
```

Importar o tipo no topo (junto dos demais tipos de `./dto`) e acrescentar `findAttempts,` ao objeto exportado no fim do arquivo.

Em `serviceService.ts`, no mesmo padrão dos repasses existentes:

```ts
async function findAttempts(id: Id) {
    return serviceAPI.findAttempts(id)
}
```

e `findAttempts,` no objeto exportado.

Criar `src/domain/agility/service/useCase/useFindServiceAttempts.ts`:

```ts
import { useQuery } from '@tanstack/react-query'

import { KEY_SERVICES } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { serviceService } from '../serviceService'

/**
 * Tentativas de entrega do pedido. `enabled` só quando há id E o pedido já tem
 * tentativa — pedido na primeira visita não gasta chamada.
 */
export function useFindServiceAttempts(id: Id | null | undefined, enabled = true) {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY_SERVICES, id, 'attempts'],
        queryFn: () => serviceService.findAttempts(id!),
        enabled: !!id && enabled,
        retry: false,
    })

    return {
        attempts: data?.result ?? [],
        isLoading,
        isError,
        refetch,
    }
}
```

Em `useCase/index.ts`, acrescentar:

```ts
export { useFindServiceAttempts } from './useFindServiceAttempts'
```

- [ ] **Step 7: Run lint and typecheck**

Run: `npm run lint` e `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 8: Commit**

```bash
git add src/domain/agility/service "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/attemptLabels.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/attemptLabels.test.ts"
git commit -m "feat(tentativas): le as tentativas do pedido no app"
```

---

### Task 4: Selo e histórico de tentativas na parada (F5, tela)

**Files:**
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/TentativasAnteriores.tsx`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/index.tsx:495-510` (dentro de `localContent`, logo após o bloco "Customer Information")

**Interfaces:**
- Consumes: `useFindServiceAttempts`, `outcomeTentativaLabel`, `tentativaTitulo` (Tarefa 3); `service.attemptCount` de `ServiceResponse`.
- Produces: componente `<TentativasAnteriores serviceId attemptCount />` — sem props de saída.

- [ ] **Step 1: Create the component**

Criar `_components/shared/TentativasAnteriores.tsx`:

```tsx
import { useState } from 'react';

import { Box, Text, TouchableOpacityBox, ActivityIndicator } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { useFindServiceAttempts } from '@/domain/agility/service/useCase';
import { measure } from '@/theme';

import { outcomeTentativaLabel, tentativaTitulo } from '../../_utils/attemptLabels';

interface Props {
  serviceId: string;
  /** `service.attemptCount`. Zero = primeira visita, o componente não renderiza. */
  attemptCount: number;
}

/** Data curta (dd/mm hh:mm) a partir do ISO do backend. */
function formatarQuando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes} ${hora}:${min}`;
}

/**
 * Selo "2a tentativa de 3" + o que houve nas tentativas anteriores.
 *
 * NÃO mostra quem tentou: a resposta do backend traz `driverName`/`failedBy`,
 * e o app deliberadamente não os renderiza (D1 da spec da Parte 2).
 */
export function TentativasAnteriores({ serviceId, attemptCount }: Props) {
  const [aberto, setAberto] = useState(false);
  const { attempts, isLoading } = useFindServiceAttempts(serviceId, attemptCount > 0);

  if (attemptCount <= 0) return null;

  const limite = attempts[0]?.maxAttempts;

  return (
    <Box gap="y8">
      <TouchableOpacityBox
        flexDirection="row"
        alignItems="center"
        gap="x8"
        backgroundColor="yellow40"
        p="y12"
        borderRadius="s12"
        onPress={() => setAberto((v) => !v)}
      >
        <Icon name="history" size={measure.m20} color="gray800" />
        <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary" flex={1}>
          {tentativaTitulo(attemptCount + 1, limite)}
        </Text>
        <Icon name={aberto ? 'expand-less' : 'expand-more'} size={measure.m20} color="gray600" />
      </TouchableOpacityBox>

      {aberto ? (
        isLoading ? (
          <Box py="y12" alignItems="center">
            <ActivityIndicator />
          </Box>
        ) : attempts.length === 0 ? (
          <Box backgroundColor="gray50" p="y12" borderRadius="s12">
            <Text preset="text12" color="gray600">
              Sem detalhes das tentativas anteriores.
            </Text>
          </Box>
        ) : (
          attempts.map((a) => (
            <Box key={a.id} backgroundColor="gray50" p="y12" borderRadius="s12" gap="y2">
              <Text preset="text12" color="gray600">
                {tentativaTitulo(a.attemptNumber, a.maxAttempts)} · {formatarQuando(a.failedAt)}
              </Text>
              <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                {a.reasonName ?? 'Sem motivo registrado'}
              </Text>
              {a.notes ? (
                <Text preset="text12" color="gray600">
                  {a.notes}
                </Text>
              ) : null}
              <Text preset="text12" color="gray500">
                {outcomeTentativaLabel(a.outcome)}
                {a.returnedFacilityName ? ` · ${a.returnedFacilityName}` : ''}
              </Text>
            </Box>
          ))
        )
      ) : null}
    </Box>
  );
}
```

- [ ] **Step 2: Mount it on the stop screen**

Em `parada/[pid]/index.tsx`, dentro de `localContent`, logo DEPOIS do `</Box>` que fecha o bloco "Customer Information" (o `Box flexDirection="row" justifyContent="space-between"` que abre em ~linha 497):

```tsx
      <TentativasAnteriores serviceId={service.id} attemptCount={service.attemptCount ?? 0} />
```

Import, junto dos demais imports de `./_components/shared`:

```tsx
import { TentativasAnteriores } from './_components/shared/TentativasAnteriores';
```

- [ ] **Step 3: Verify the icons exist**

Run: `grep -rn "'history'\|'expand-more'\|'expand-less'" src/components/Icon/ | head`
Expected: os três nomes aparecem no mapa de ícones. Se algum não existir, trocar por um já usado no arquivo (`inventory-2` e `check-circle` estão em uso na tela de retorno) e seguir.

- [ ] **Step 4: Run lint and typecheck**

Run: `npm run lint` e `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/TentativasAnteriores.tsx" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/index.tsx"
git commit -m "feat(parada): mostra que e nova tentativa e o que houve antes"
```

---

### Task 5: CD da devolução e quem recebeu (F3)

**Files:**
- Modify: `src/domain/agility/routing/dto/response/routing.response.ts:193` (campo `returnFacilityId`)
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/retorno/index.tsx` (hook da rota, estado, UI e payload)

**Interfaces:**
- Consumes: `useFindOneRouting` de `@/domain/agility/routing/useCase` (devolve `{ routing }`); `useFindAllDistributionCenters` de `@/domain/agility/distribution-center/useCase` (devolve `{ distributionCenters }`, item com `id` e `name`); `montarReturnChecklist` (Tarefa 1).
- Produces: `returnFacilityId` e `receivedBy` no corpo de `completion-details` — nada depende disso no app.

- [ ] **Step 1: Declare the field in the routing DTO**

Em `routing.response.ts`, logo após `destinationFacilityId`:

```ts
    /** CD para onde a rota volta. Sugestão do CD na devolução da parada de retorno. */
    returnFacilityId?: string | null
```

- [ ] **Step 2: Confirm the backend sends it**

Run (no repo `agility-services`): `git grep -n "returnFacilityId" origin/development -- src/routing/entities/routing.entity.ts`
Expected: a linha do `toJson()` (`returnFacilityId: this.returnFacilityId() ?? null`). Se o payload de `GET /routings/:id` não passar por esse `toJson`, o seletor apenas abre sem pré-seleção — **não** bloquear a tarefa por isso; registrar no commit.

- [ ] **Step 3: Wire the hooks and state in the screen**

Em `retorno/index.tsx`, junto dos demais hooks do topo de `RetornoContent`:

```ts
  const { routing } = useFindOneRouting(routeId || '');
  const { distributionCenters } = useFindAllDistributionCenters({ activeOnly: true });

  // CD da devolução: o da rota vem sugerido; o motorista pode trocar (pode ter
  // deixado a carga em outro CD). Opcional — sem CD o backend fecha a tentativa
  // sem gravar custódia.
  const [returnFacilityId, setReturnFacilityId] = useState<string | null>(null);
  const [recebedor, setRecebedor] = useState('');
  const cdSelecionado = returnFacilityId ?? routing?.returnFacilityId ?? null;
```

Imports novos:

```ts
import { useFindAllDistributionCenters } from '@/domain/agility/distribution-center/useCase';
import { useCompleteRouting, useFindOneRouting, useGetRoutingMapData, useReturnManifest } from '@/domain/agility/routing/useCase';
```

- [ ] **Step 4: Render the picker and the field**

Logo ANTES do bloco `{/* Comprovante (opcional) ... */}`, e só depois da chegada:

```tsx
        {hasArrived ? (
          <Box gap="y8">
            <Text preset="text14" fontWeightPreset="bold" color="gray600">
              Onde a carga foi deixada
            </Text>
            <Box flexDirection="row" flexWrap="wrap" gap="x8">
              {distributionCenters.map((cd) => {
                const selecionado = cdSelecionado === cd.id;
                return (
                  <TouchableOpacityBox
                    key={cd.id}
                    paddingHorizontal="x12"
                    paddingVertical="y8"
                    borderRadius="s8"
                    borderWidth={1}
                    borderColor={selecionado ? 'primary100' : 'gray200'}
                    backgroundColor={selecionado ? 'primary10' : 'white'}
                    onPress={() => setReturnFacilityId(cd.id)}
                  >
                    <Text preset="text12" color={selecionado ? 'primary100' : 'gray600'}>
                      {cd.name}
                    </Text>
                  </TouchableOpacityBox>
                );
              })}
            </Box>
            <Text preset="text12" color="gray500">
              Quem recebeu no CD (opcional)
            </Text>
            <Box borderWidth={1} borderColor="gray200" borderRadius="s8" paddingHorizontal="x12" backgroundColor="white">
              <TextInput
                value={recebedor}
                onChangeText={setRecebedor}
                placeholder="Nome de quem recebeu"
                style={{ paddingVertical: 10, color: '#111827' }}
              />
            </Box>
          </Box>
        ) : null}
```

- [ ] **Step 5: Send both fields**

No `handleConcluirRetorno`, no objeto `details`:

```ts
        details: {
          returnChecklist,
          ...(cdSelecionado ? { returnFacilityId: cdSelecionado } : {}),
          ...(recebedor.trim() ? { receivedBy: recebedor.trim() } : {}),
          ...(photoProof ? { photoProof } : {}),
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy } : {}),
        },
```

Acrescentar `cdSelecionado` e `recebedor` às dependências do `useCallback`.

**Por que os spreads condicionais:** `returnFacilityId` é `@IsUUID()` no backend — mandar `null` ou string vazia dá 400.

- [ ] **Step 6: Run lint and typecheck**

Run: `npm run lint` e `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 7: Commit**

```bash
git add src/domain/agility/routing/dto/response/routing.response.ts "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/retorno/index.tsx"
git commit -m "feat(retorno): escolhe o CD da devolucao e quem recebeu"
```

---

### Task 6: "Cheguei no retorno" conta `AT_HUB` só em perna TRANSFER (F4)

`isHandedOff` trata `AT_HUB` como "encerrado para o trecho" sem olhar o tipo da perna. Com a Parte 1, o pedido devolvido em rota comum passa a ficar `AT_HUB` — a fase deixou de ser inerte fora da malha.

**Files:**
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/returnGate.ts`
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/returnGate.test.ts`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/retorno/index.tsx:40-56` (remover `isTerminalStatus`/`isHandedOff` locais) e `:125-134` (`othersDone`)

**Interfaces:**
- Consumes: `routing.legType` (já tipado em `routing.response.ts:174`), via o `useFindOneRouting` introduzido na Tarefa 5.
- Produces: `isTerminalStatus(status)`, `isHandedOff(phase, legType)`, `othersConcluidos(services, legType)`.

- [ ] **Step 1: Write the failing test**

Criar `_utils/__tests__/returnGate.test.ts`:

```ts
import { isHandedOff, isTerminalStatus, othersConcluidos } from '../returnGate'

describe('isTerminalStatus', () => {
    it('aceita os quatro terminais, em qualquer caixa', () => {
        expect(isTerminalStatus('COMPLETED')).toBe(true)
        expect(isTerminalStatus('failed')).toBe(true)
        expect(isTerminalStatus('CANCELED')).toBe(true)
        expect(isTerminalStatus('CANCELLED')).toBe(true)
        expect(isTerminalStatus('PENDING')).toBe(false)
        expect(isTerminalStatus(null)).toBe(false)
    })
})

describe('isHandedOff', () => {
    it('AT_HUB so conta como entregue em perna de malha', () => {
        expect(isHandedOff('AT_HUB', 'TRANSFER')).toBe(true)
        expect(isHandedOff('AT_HUB', 'LAST_MILE')).toBe(false)
        expect(isHandedOff('AT_HUB', null)).toBe(false)
    })

    it('OUT_FOR_DELIVERY e DELIVERED contam em qualquer perna', () => {
        expect(isHandedOff('OUT_FOR_DELIVERY', null)).toBe(true)
        expect(isHandedOff('DELIVERED', 'LAST_MILE')).toBe(true)
    })

    it('fases pre-handoff nunca contam', () => {
        expect(isHandedOff('AT_ORIGIN', 'TRANSFER')).toBe(false)
        expect(isHandedOff('IN_TRANSIT', 'TRANSFER')).toBe(false)
        expect(isHandedOff('EXCEPTION', 'TRANSFER')).toBe(false)
        expect(isHandedOff(null, 'TRANSFER')).toBe(false)
    })
})

describe('othersConcluidos', () => {
    const rotaComum = null

    it('ignora a propria parada de retorno', () => {
        const services = [{ serviceType: 'RETURN', status: 'PENDING', custodyPhase: 'AT_ORIGIN' }]
        expect(othersConcluidos(services, rotaComum)).toBe(true)
    })

    it('pedido devolvido em rota comum (FAILED + AT_HUB) conta pelo status, nao pela fase', () => {
        const services = [{ serviceType: 'DELIVERY', status: 'FAILED', custodyPhase: 'AT_HUB' }]
        expect(othersConcluidos(services, rotaComum)).toBe(true)
    })

    it('pedido PENDING marcado AT_HUB em rota comum NAO libera o retorno', () => {
        const services = [{ serviceType: 'DELIVERY', status: 'PENDING', custodyPhase: 'AT_HUB' }]
        expect(othersConcluidos(services, rotaComum)).toBe(false)
    })

    it('em perna TRANSFER o mesmo pedido AT_HUB libera', () => {
        const services = [{ serviceType: 'DELIVERY', status: 'PENDING', custodyPhase: 'AT_HUB' }]
        expect(othersConcluidos(services, 'TRANSFER')).toBe(true)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/returnGate.test.ts" --watchAll=false`
Expected: FAIL — `Cannot find module '../returnGate'`.

- [ ] **Step 3: Write minimal implementation**

Criar `_utils/returnGate.ts`:

```ts
/**
 * Trava do "Cheguei no retorno": o retorno é a última parada, então o check-in
 * só libera quando as demais paradas já estão encerradas para o motorista.
 *
 * `AT_HUB` significa "descarregado num CD" e só encerra a parada quando o trecho
 * é de MALHA: a partir da Parte 1 das tentativas, o pedido devolvido numa rota
 * comum também passa a ficar `AT_HUB`, e contá-lo como entregue liberaria o
 * retorno com pedido ainda por fazer.
 *
 * @module rotas-detalhadas/parada/utils/returnGate
 */

/** Papel do trecho na malha; null/undefined em rota comum. */
export type LegType = 'TRANSFER' | 'LAST_MILE' | null | undefined

/** Status terminal de parada (concluída/falha/cancelada). */
export function isTerminalStatus(status?: string | null): boolean {
    return ['COMPLETED', 'FAILED', 'CANCELED', 'CANCELLED'].includes(String(status ?? '').toUpperCase())
}

/**
 * Pedido já entregue no CD de destino (handoff feito) — responsabilidade do CD,
 * não mais do motorista. `AT_HUB` só vale em perna TRANSFER.
 */
export function isHandedOff(phase?: string | null, legType?: LegType): boolean {
    const fase = String(phase ?? '').toUpperCase()
    if (fase === 'OUT_FOR_DELIVERY' || fase === 'DELIVERED') return true
    return fase === 'AT_HUB' && String(legType ?? '').toUpperCase() === 'TRANSFER'
}

/** Campos que a trava usa de cada parada da rota. */
export interface ParadaGate {
    serviceType?: string | null
    status?: string | null
    custodyPhase?: string | null
}

/** Todas as paradas que não são o retorno estão encerradas? */
export function othersConcluidos(services: ParadaGate[] | undefined | null, legType: LegType): boolean {
    const others = (services ?? []).filter(
        (s) => String(s.serviceType ?? '').toUpperCase() !== 'RETURN',
    )
    return others.every((s) => isTerminalStatus(s.status) || isHandedOff(s.custodyPhase, legType))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/returnGate.test.ts" --watchAll=false`
Expected: PASS (9 testes).

- [ ] **Step 5: Wire the screen**

Em `retorno/index.tsx`:
1. Apagar as funções locais `isTerminalStatus`, `isHandedOff` e a constante `HANDED_OFF_PHASES` (linhas ~40-56), com os comentários delas.
2. Importar: `import { othersConcluidos } from '../_utils/returnGate';`
3. Trocar o corpo do `useMemo` do `othersDone` por:

```ts
  const othersDone = useMemo(
    () => othersConcluidos(services, routing?.legType),
    [services, routing?.legType],
  );
```

- [ ] **Step 6: Run lint and typecheck**

Run: `npm run lint` e `npx tsc --noEmit`
Expected: sem erros novos (conferir que `isTerminalStatus` não é usado em outro ponto do arquivo: `grep -n "isTerminalStatus" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/retorno/index.tsx"`).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/returnGate.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_utils/__tests__/returnGate.test.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/retorno/index.tsx"
git commit -m "fix(retorno): AT_HUB so encerra a parada em perna de malha"
```

---

### Task 7: GPS na ocorrência (F1)

**Files:**
- Modify: `src/domain/agility/service/dto/request/apply-occurrence.request.ts`
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/insucesso/occurrenceLocation.ts`
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/insucesso/__tests__/occurrenceLocation.test.ts`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/insucesso/index.tsx` (`handleSubmit`)

**Interfaces:**
- Consumes: `getCurrentCoords()` de `../_hooks/getCurrentCoords` → `{ latitude, longitude, accuracy? } | undefined`.
- Produces: `coordsParaOcorrencia(coords)` → `{ latitude, longitude, accuracy? } | null`.

- [ ] **Step 1: Write the failing test**

Criar `insucesso/__tests__/occurrenceLocation.test.ts`:

```ts
import { coordsParaOcorrencia } from '../occurrenceLocation'

describe('coordsParaOcorrencia', () => {
    it('manda o par completo', () => {
        expect(coordsParaOcorrencia({ latitude: -23.5, longitude: -46.6, accuracy: 8 }))
            .toEqual({ latitude: -23.5, longitude: -46.6, accuracy: 8 })
    })

    it('nao poda a coordenada zero', () => {
        expect(coordsParaOcorrencia({ latitude: 0, longitude: 0 }))
            .toEqual({ latitude: 0, longitude: 0 })
    })

    it('sem GPS nao manda nada', () => {
        expect(coordsParaOcorrencia(undefined)).toBeNull()
    })

    it('meia coordenada nao vai (o backend responde 400)', () => {
        expect(coordsParaOcorrencia({ latitude: -23.5 } as never)).toBeNull()
        expect(coordsParaOcorrencia({ latitude: Number.NaN, longitude: -46.6 } as never)).toBeNull()
    })

    it('descarta accuracy invalida sem descartar o par', () => {
        expect(coordsParaOcorrencia({ latitude: -23.5, longitude: -46.6, accuracy: -1 }))
            .toEqual({ latitude: -23.5, longitude: -46.6 })
        expect(coordsParaOcorrencia({ latitude: -23.5, longitude: -46.6, accuracy: Number.NaN }))
            .toEqual({ latitude: -23.5, longitude: -46.6 })
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/insucesso/__tests__/occurrenceLocation.test.ts" --watchAll=false`
Expected: FAIL — `Cannot find module '../occurrenceLocation'`.

- [ ] **Step 3: Write minimal implementation**

Criar `insucesso/occurrenceLocation.ts`:

```ts
/**
 * GPS da ocorrência: de onde o motorista registrou a falha. Vira
 * `latitude/longitude/accuracy` na tentativa de entrega (a prova de campo da
 * falha), e é BEST-EFFORT — sem GPS a nota é registrada do mesmo jeito.
 *
 * O backend valida o par: latitude sem longitude responde 400. Por isso só o par
 * completo é enviado, e `latitude: 0` (coordenada legítima) não pode ser podado
 * por teste de falsy.
 *
 * @module rotas-detalhadas/parada/insucesso/occurrenceLocation
 */

import type { CapturedCoords } from '../_hooks/getCurrentCoords'

export interface OccurrenceLocationPayload {
    latitude: number
    longitude: number
    accuracy?: number
}

export function coordsParaOcorrencia(
    coords: CapturedCoords | undefined | null,
): OccurrenceLocationPayload | null {
    if (!coords) return null
    if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return null

    const payload: OccurrenceLocationPayload = {
        latitude: coords.latitude,
        longitude: coords.longitude,
    }
    if (Number.isFinite(coords.accuracy) && (coords.accuracy as number) >= 0) {
        payload.accuracy = coords.accuracy as number
    }
    return payload
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/insucesso/__tests__/occurrenceLocation.test.ts" --watchAll=false`
Expected: PASS (5 testes).

- [ ] **Step 5: Extend the request DTO**

Em `apply-occurrence.request.ts`:

```ts
export interface ApplyOccurrenceRequest {
    occurrenceReasonId: string
    note?: string
    photoProof?: string[]
    /** GPS de onde a falha foi registrada (best-effort; vai só o par completo). */
    latitude?: number
    longitude?: number
    accuracy?: number
}
```

- [ ] **Step 6: Wire the screen**

Em `insucesso/index.tsx`, dentro de `handleSubmit`, logo antes do `registerOccurrence(...)`:

```ts
    // GPS best-effort: o `getCurrentCoords` nunca lança e tem timeout de 5s, então
    // a nota segue sem localização quando o aparelho não responde.
    const localizacao = coordsParaOcorrencia(await getCurrentCoords());
    if (localizacao) {
      Object.assign(payload, localizacao);
    }
```

Imports:

```ts
import { getCurrentCoords } from '../_hooks/getCurrentCoords';
import { coordsParaOcorrencia } from './occurrenceLocation';
```

- [ ] **Step 7: Run lint and typecheck**

Run: `npm run lint` e `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 8: Commit**

```bash
git add src/domain/agility/service/dto/request/apply-occurrence.request.ts "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/insucesso"
git commit -m "feat(insucesso): registra o GPS de onde a falha foi anotada"
```

---

### Task 8: `PUT /status` e `PATCH` param de criar FAILED (B2, backend)

É a única porta que fura o modelo da Parte 1: os dois caminhos gravam FAILED sem criar tentativa, então `attemptCount` não sobe, não nasce `AWAITING_RETURN` e os cinco 409 não disparam — a rota pode ser movida ou excluída com a mercadoria no caminhão.

**Repo:** `agility-services`, branch a partir de `origin/development`.

**Files:**
- Modify: `src/service/service/service.service.ts` (`changeStatus` ~2401 e `update` ~834-839)
- Modify: `src/service/service/service.service.spec.ts` (describe `changeStatus`)

**Interfaces:**
- Produces: `assertFailedHasOwnPath(to: ServiceStatus): void` — privado, usado pelos dois caminhos.

- [ ] **Step 1: Write the failing test**

Em `service.service.spec.ts`, dentro do `describe('changeStatus', ...)`:

```ts
        it('recusa FAILED: falha precisa de tentativa (ocorrência ou /fail)', async () => {
            mockServiceRepository.findByIdForValidation.mockResolvedValue({
                id: 'test-id',
                status: ServiceStatus.ASSIGNED,
                branchId: null,
            });

            await expect(service.changeStatus('test-id', ServiceStatus.FAILED))
                .rejects.toThrow(BadRequestException);
            expect(mockServiceRepository.updateStatusDirect).not.toHaveBeenCalled();
        });

        it('continua aceitando os demais destinos', async () => {
            mockServiceRepository.findByIdForValidation.mockResolvedValue({
                id: 'test-id',
                status: ServiceStatus.PENDING,
                branchId: null,
            });
            mockServiceRepository.updateStatusDirect.mockResolvedValue(entity);

            await service.changeStatus('test-id', ServiceStatus.ASSIGNED);
            expect(mockServiceRepository.updateStatusDirect).toHaveBeenCalled();
        });
```

Conferir o nome dos mocks no topo do arquivo antes de colar (o describe já existente mostra o padrão em uso) e que `BadRequestException` está importado.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/service/service/service.service.spec.ts -t "recusa FAILED"`
Expected: FAIL — nenhuma exceção é lançada; `updateStatusDirect` foi chamado.

- [ ] **Step 3: Write minimal implementation**

Em `service.service.ts`, junto de `assertCanLeaveFailed`:

```ts
    /**
     * FALHA NÃO É TROCA DE STATUS. Marcar FAILED por `PUT /:id/status` ou por
     * `PATCH /:id` gravaria um pedido falhado SEM tentativa: `attemptCount` não
     * sobe, nenhuma linha `AWAITING_RETURN` nasce, e por isso os 409 que seguram
     * o pedido na rota até a devolução não disparam — a rota poderia ser movida
     * ou excluída com a mercadoria ainda no caminhão. Os caminhos que registram a
     * tentativa são `POST /:id/occurrence` (motorista) e `POST /:id/fail` (legado).
     */
    private assertFailedHasOwnPath(to: ServiceStatus | undefined): void {
        if (to !== ServiceStatus.FAILED) return;
        throw new BadRequestException(
            'Insucesso não é troca de status: registre a ocorrência do pedido (POST /services/:id/occurrence) para que a tentativa e a devolução ao CD sejam criadas.',
        );
    }
```

Chamar em `changeStatus`, ANTES de `validateStatusTransition`:

```ts
        this.assertFailedHasOwnPath(status);
```

E em `update`, dentro do `if (updateServiceDto.status) {`, como primeira linha:

```ts
            this.assertFailedHasOwnPath(updateServiceDto.status);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/service/service/service.service.spec.ts`
Expected: PASS, incluindo os testes já existentes do describe (nenhum deles muda FAILED por esses caminhos).

- [ ] **Step 5: Check no internal caller breaks**

Run: `git grep -n "changeStatus(" -- src | grep -v spec`
Expected: só o controller. Se aparecer chamada interna com FAILED, parar e relatar antes de seguir.

- [ ] **Step 6: Commit**

```bash
git add src/service/service/service.service.ts src/service/service/service.service.spec.ts
git commit -m "fix(tentativas): PUT /status e PATCH nao criam mais FAILED sem tentativa"
```

---

## Verificação fim a fim (depois de todas as tarefas)

Repetir no dev o roteiro da validação da Parte 1, agora pelo app (é o caminho que a validação de 17/09 **não** exercitou):

1. Ocorrência `RETURN_TO_POOL` numa parada, pelo app → conferir em `GET /services/:id/attempts` que a tentativa nasceu com `latitude`/`longitude`.
2. Conferir na parada de retorno, escolhendo CD e digitando quem recebeu, incluindo um pedido falhado **sem** linha de manifesto.
3. Conferir que a tentativa fechou com `return_source = RETURN_STOP`, `returned_facility_id` preenchido, `received_by` com o nome digitado e `CustodyHandoff` gravado — e que o pedido `RETURN_TO_POOL` voltou a PENDING, fora da rota.
4. Abrir a parada de um pedido com tentativa anterior e conferir o selo "2a tentativa de 3" e o detalhe, **sem** nome de motorista.
