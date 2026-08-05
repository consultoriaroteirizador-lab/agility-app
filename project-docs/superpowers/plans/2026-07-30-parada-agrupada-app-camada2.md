# Parada Agrupada no App (Camada 2) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o app do motorista exibir uma PARADA por porta (agrupando pedidos contíguos do mesmo endereço/cliente), sem que a regra "uma parada por vez" trave o motorista entre notas da mesma porta.

**Architecture:** Agrupamento é de LEITURA e ADITIVO. Uma função pura (`stopGrouping.ts`) define a chave da parada e agrupa vizinhos contíguos; `Parada` mantém `serviceId` (do pedido representante) e ganha `pedidos: ServiceResponse[]`. Nenhum endpoint, DTO ou migration muda. O fluxo de entrega por pedido (foto, canhoto, código, insucesso) fica intocado — a tela da parada vira um índice quando N>1.

**Tech Stack:** React Native 0.81 + Expo 54 + expo-router 6, TanStack Query 5, TypeScript 5.9, Jest 29 (`jest-expo`), react-test-renderer 19.

**Spec:** `project-docs/superpowers/specs/2026-07-30-parada-agrupada-app-camada2-design.md` (commit 9d4e9fa). A spec fecha o QUÊ; este plano fecha a ORDEM.

**Branch:** `feat/parada-agrupada-app` (já criada a partir de `origin/main`). PR contra `main` — este repo não tem `development`.

---

## Global Constraints

- **A ORDEM É A ENTREGA.** A Task 2 (`useStopStatus` — irmãos não conflitam) tem que estar commitada ANTES da Task 4 (agrupamento em `Parada`). Invertido, existe um commit em que o app agrupa e a regra "uma parada por vez" trava o motorista na primeira nota da porta.
- **Baseline verificado em 2026-07-30, antes da primeira linha:** `npx tsc --noEmit` → exit 0; `npx jest --ci` → 13 suítes, 110 testes, todos verdes. Qualquer vermelho novo é regressão desta branch.
- **Nunca rode `npm test`** — o script é `jest --watchAll` e trava a sessão. Use `npx jest --ci` (tudo) ou `npx jest --ci <regex-do-arquivo>` (um só).
- **Antes de CADA commit:** `npx tsc --noEmit && npx jest --ci` — encadeado com `&&`, nessa ordem. Só commite com os dois verdes.
- **Prova por mutação, uma de cada vez.** Onde o plano pede mutação: copie o arquivo para o scratchpad, anote o hash MD5, mute, rode o teste esperando VERMELHO, restaure copiando o backup de volta e confira o MD5. **NUNCA use `git checkout --` para reverter mutação** — já apagou trabalho não-commitado neste projeto. Scratchpad: `C:\Users\daniel\AppData\Local\Temp\claude\c--Users-daniel-Agility-Front-lab-app\5268d159-4db2-4dae-8125-f082f9a5b9f9\scratchpad`.
- **Teste pré-existente que ficar vermelho: LEIA antes de mexer.** Se ele codificava o bug, reescreva registrando o motivo no comentário do teste. Nunca apague teste para chegar ao verde.
- **Agrupar por VIZINHANÇA (contíguos), nunca por afinidade.** Afinidade reordenaria o itinerário que o otimizador decidiu.
- **Aditivo:** `Parada.serviceId` continua existindo e passa a ser o do pedido representante (o primeiro do grupo). Os ~68 arquivos que leem `Parada` não podem quebrar.
- **Zero backend:** nenhum endpoint, DTO, migration ou contrato novo.
- **Commits por unidade lógica** (um por task), mensagens em português, corpo explicando o porquê.
- `graphify` não está no PATH deste shell (não há `python`). O hook de `post-commit` cuida do rebuild do grafo; não bloqueie a task por causa disso e **nunca dê `Read` em `graphify-out/graph.json`**.

---

## File Structure

**Criar**

| Arquivo | Responsabilidade |
|---|---|
| `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/stopGrouping.ts` | Fonte única do agrupamento: chave da parada, agrupamento de vizinhos contíguos, busca do grupo de um serviço, chave dos pontos do mapa. Puro, sem React. |
| `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/stopGrouping.test.ts` | Testes do agrupamento contíguo e da chave. |
| `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/paradaAgrupada.test.ts` | Testes de `mapServicesToParadas`/`mapGrupoToParada`: N pedidos → 1 parada, status agregado, janela restritiva, contagem de notas. |

**Modificar**

| Arquivo | Mudança |
|---|---|
| `[id]/parada/[pid]/_hooks/useStopStatus.ts` | Irmãos da mesma parada não conflitam entre si (regra "uma por vez" e "ordem"). |
| `[id]/parada/[pid]/_hooks/__tests__/useStopStatus.test.tsx` | Novo `describe` para os irmãos (5 casos, incluindo o de rota legada não contígua). |
| `[id]/_utils/routeCalculations.ts` | `mapServicesToParadas` agrupa; `findOutrasParadas` compara por `serviceId`; contagem de notas. |
| `[id]/_utils/statusMappers.ts` | `mapGrupoToParada` (novo) + `getParadaStatusGrupo` (novo); `mapServiceToParada` vira caso de 1 pedido. |
| `[id]/_utils/index.ts` | Exporta o que nasceu nas tasks. |
| `[id]/_types/rota.types.ts` | `Parada` ganha `pedidos`, `chaveParada`, `enderecoRepetido`; `ParadaCountResult` ganha notas. |
| `[id]/parada/[pid]/index.tsx` | N>1 → índice de notas; N==1 → redirect atual, inalterado. |
| `[id]/_components/TransferOrderCard.tsx` | Props opcionais aditivas (`titulo`, `subtitulo`, `badge`, `onOpen`, `openLabel`). |
| `[id]/_components/TransferOrderList.tsx` | Props opcionais aditivas (`titulo`, `onOpen`). |
| `[id]/_components/ParadaListItem.tsx` | Badge "N notas", "3 de 5 entregues" no insucesso misto, aviso de endereço repetido. |
| `[id]/_components/RouteProgress.tsx` | "X de Y paradas · N de M notas". |
| `[id]/_hooks/useRouteDetails.ts` | Contagem de notas na `contagem` (via `countParadasByStatus`, sem mudança de assinatura). |
| `[id]/_context/RotaContext.tsx` | Usa `ParadaCountResult` de `_utils` em vez da cópia local. |
| `[id]/parada/[pid]/_components/shared/useRouteMapView.ts` | Um pino por parada, com contagem quando N>1. |

---

## Ordem das tasks e por quê

```
1. stopGrouping (puro, sem consumidor)      ← primitivo que as duas pontas usam
2. useStopStatus: irmãos não conflitam      ← BLOQUEADOR. Sozinho já é seguro:
                                              só RELAXA o gate, nunca prende ninguém
3. findOutrasParadas por serviceId          ← blindagem ANTES de recriar os arrays
4. Parada ganha pedidos[] (agrupa de fato)  ← só agora o motorista vê 26 no lugar de 56
5. Tela da parada vira índice (N>1)
6. Lista da rota: N notas / 3 de 5 / aviso
7. Progresso: paradas e notas
8. Mapa: 1 pino por parada
```

Depois da Task 2, a Task 4 pode entrar a qualquer momento sem travar ninguém. Antes dela, não.

---

### Task 1: Fundação — chave da parada e agrupamento contíguo

Função pura, sem consumidor ainda. É o primitivo que a Task 2 (gate) e a Task 4 (lista) precisam compartilhar — se cada uma tiver a sua cópia, o gate e a tela discordam sobre o que é "a mesma parada", e esse desacordo é invisível até travar o motorista em produção.

**Files:**
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/stopGrouping.ts`
- Create: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/stopGrouping.test.ts`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/index.ts`

**Interfaces:**
- Consumes: `ServiceType` de `@/domain/agility/service/dto/types` (enum de string: `DELIVERY|PICKUP|SERVICE|TRANSFER|RETURN`).
- Produces:
  - `interface StopKeyInput { id: string; addressId?: string | null; customerId?: string | null; fantasyName?: string | null; responsible?: string | null; serviceType?: string | null }`
  - `stopKeyOf(service: StopKeyInput): string`
  - `groupContiguousBy<T>(items: T[], keyOf: (item: T) => string): T[][]`
  - `groupContiguousStops<T extends StopKeyInput>(orderedServices: T[]): T[][]`
  - `findGrupoDoServico<T extends StopKeyInput>(groups: T[][], serviceId: string): T[] | null`
  - `contarChavesRepetidas(groups: StopKeyInput[][]): Set<string>`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/stopGrouping.test.ts`:

```ts
/**
 * Agrupamento de PEDIDOS em PARADAS.
 *
 * Regra: agrupa VIZINHOS CONTÍGUOS (sequenceOrder adjacente) com a mesma chave.
 * Nunca por afinidade — afinidade reordenaria o itinerário que o otimizador
 * decidiu. Em rota legada (planejada antes da Camada 1, ou reordenada à mão) os
 * irmãos podem não estar contíguos: aí a mesma porta vira DUAS paradas. É o
 * comportamento seguro, e o teste `rota legada` abaixo o congela de propósito.
 */
import { ServiceType } from '@/domain/agility/service/dto/types'

import {
    contarChavesRepetidas,
    findGrupoDoServico,
    groupContiguousStops,
    stopKeyOf,
    type StopKeyInput,
} from '../stopGrouping'

function svc(over: Partial<StopKeyInput> & { id: string }): StopKeyInput {
    return {
        addressId: 'addr-1',
        customerId: 'cli-1',
        fantasyName: null,
        responsible: null,
        serviceType: ServiceType.DELIVERY,
        ...over,
    }
}

describe('stopKeyOf', () => {
    it('mesma porta e mesmo cliente → mesma chave', () => {
        expect(stopKeyOf(svc({ id: 'a' }))).toBe(stopKeyOf(svc({ id: 'b' })))
    })

    it('mesmo endereço, clientes diferentes → chaves diferentes (2 recebedores, 2 canhotos)', () => {
        expect(stopKeyOf(svc({ id: 'a', customerId: 'cli-1' })))
            .not.toBe(stopKeyOf(svc({ id: 'b', customerId: 'cli-2' })))
    })

    it('cai para fantasyName quando não há customerId, normalizando caixa e espaços', () => {
        const a = svc({ id: 'a', customerId: null, fantasyName: ' SAO LUIZ CRATO ' })
        const b = svc({ id: 'b', customerId: null, fantasyName: 'sao luiz crato' })
        expect(stopKeyOf(a)).toBe(stopKeyOf(b))
    })

    it('sem addressId nunca agrupa (não dá para afirmar que é a mesma porta)', () => {
        const a = svc({ id: 'a', addressId: null })
        const b = svc({ id: 'b', addressId: null })
        expect(stopKeyOf(a)).not.toBe(stopKeyOf(b))
    })

    it('RETORNO e TRANSFERÊNCIA nunca agrupam (parada única / A→B com dois endereços)', () => {
        const r1 = svc({ id: 'r1', serviceType: ServiceType.RETURN })
        const r2 = svc({ id: 'r2', serviceType: ServiceType.RETURN })
        const t1 = svc({ id: 't1', serviceType: ServiceType.TRANSFER })
        const t2 = svc({ id: 't2', serviceType: ServiceType.TRANSFER })
        expect(stopKeyOf(r1)).not.toBe(stopKeyOf(r2))
        expect(stopKeyOf(t1)).not.toBe(stopKeyOf(t2))
    })

    it('tipos diferentes na mesma porta não agrupam (entrega e coleta têm fluxos distintos)', () => {
        const entrega = svc({ id: 'a', serviceType: ServiceType.DELIVERY })
        const coleta = svc({ id: 'b', serviceType: ServiceType.PICKUP })
        expect(stopKeyOf(entrega)).not.toBe(stopKeyOf(coleta))
    })
})

describe('groupContiguousStops', () => {
    it('5 pedidos contíguos da mesma porta → 1 grupo de 5', () => {
        const services = ['a', 'b', 'c', 'd', 'e'].map((id) => svc({ id }))
        const groups = groupContiguousStops(services)
        expect(groups).toHaveLength(1)
        expect(groups[0].map((s) => s.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('rota legada: mesma chave NÃO contígua → 2 grupos, itinerário preservado', () => {
        const services = [
            svc({ id: 'a' }),
            svc({ id: 'meio', addressId: 'addr-2', customerId: 'cli-2' }),
            svc({ id: 'b' }),
        ]
        const groups = groupContiguousStops(services)
        expect(groups.map((g) => g.map((s) => s.id))).toEqual([['a'], ['meio'], ['b']])
    })

    it('lista vazia → nenhum grupo', () => {
        expect(groupContiguousStops([])).toEqual([])
    })
})

describe('findGrupoDoServico', () => {
    it('acha o grupo que contém o serviço', () => {
        const groups = groupContiguousStops([svc({ id: 'a' }), svc({ id: 'b' })])
        expect(findGrupoDoServico(groups, 'b')?.map((s) => s.id)).toEqual(['a', 'b'])
    })

    it('id desconhecido → null', () => {
        const groups = groupContiguousStops([svc({ id: 'a' })])
        expect(findGrupoDoServico(groups, 'zzz')).toBeNull()
    })
})

describe('contarChavesRepetidas', () => {
    it('marca a chave que aparece em mais de um grupo (mesma porta partida pelo itinerário)', () => {
        const groups = groupContiguousStops([
            svc({ id: 'a' }),
            svc({ id: 'meio', addressId: 'addr-2', customerId: 'cli-2' }),
            svc({ id: 'b' }),
        ])
        const repetidas = contarChavesRepetidas(groups)
        expect(repetidas.has(stopKeyOf(svc({ id: 'a' })))).toBe(true)
        expect(repetidas.has(stopKeyOf(svc({ id: 'meio', addressId: 'addr-2', customerId: 'cli-2' })))).toBe(false)
    })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --ci stopGrouping`
Expected: FAIL — `Cannot find module '../stopGrouping'`.

- [ ] **Step 3: Implementar**

Criar `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/stopGrouping.ts`:

```ts
/**
 * Agrupamento de PEDIDOS em PARADAS (Camada 2 do épico "parada ≠ pedido").
 *
 * `Service` acumula dois papéis no modelo: é o PEDIDO e é a PARADA. Com os dados
 * reais do cliente, o motorista veria 56 paradas onde são 26 — a mesma porta 5
 * vezes seguidas. Aqui está a fonte ÚNICA da resposta para "estes dois pedidos
 * são a mesma parada?". Fonte única de propósito: se o gate de "uma parada por
 * vez" e a lista da tela responderem diferente, o motorista trava sem entender.
 *
 * O agrupamento é por VIZINHANÇA (contíguos na ordem do roteirizador), nunca por
 * afinidade — afinidade reordenaria o itinerário que o otimizador decidiu. A
 * Camada 1 (backend, agility-services PR #427) garante que os pedidos de uma
 * mesma parada saem com `sequenceOrder` contíguo.
 *
 * @module rotas-detalhadas/utils/stopGrouping
 */

import { ServiceType } from '@/domain/agility/service/dto/types'

/** Campos mínimos para identificar a parada de um pedido. `ServiceResponse` os satisfaz. */
export interface StopKeyInput {
    id: string
    addressId?: string | null
    customerId?: string | null
    fantasyName?: string | null
    responsible?: string | null
    serviceType?: string | null
}

function normalizar(valor: string): string {
    return valor.trim().toLowerCase()
}

/**
 * Chave da parada de um pedido. Pedidos com a MESMA chave e CONTÍGUOS formam
 * uma parada só.
 *
 * `solo:<id>` é a chave de quem nunca agrupa — é única por definição, então dois
 * "solo" jamais colidem:
 *  - RETURN: parada final no CD, uma só por rota;
 *  - TRANSFER: ponto-a-ponto (A→B), tem dois endereços e wizard próprio;
 *  - sem `addressId`: não dá para afirmar que é a mesma porta;
 *  - sem identificação de cliente: dois recebedores no mesmo endereço são duas
 *    paradas (decisão da Camada 1 — dois canhotos), e sem nome não dá para saber.
 *
 * O tipo entra na chave: entrega e coleta na mesma porta têm fluxos distintos, e
 * mantê-las separadas preserva o `tipo` escalar da `Parada` e o redirect de N==1.
 */
export function stopKeyOf(service: StopKeyInput): string {
    if (
        service.serviceType === ServiceType.RETURN ||
        service.serviceType === ServiceType.TRANSFER
    ) {
        return `solo:${service.id}`
    }

    if (!service.addressId) {
        return `solo:${service.id}`
    }

    const cliente = service.customerId ?? service.fantasyName ?? service.responsible
    if (!cliente) {
        return `solo:${service.id}`
    }

    return `addr:${service.addressId}|cli:${normalizar(cliente)}|tipo:${service.serviceType ?? ''}`
}

/** Agrupa itens ADJACENTES que compartilham a chave. Não reordena nada. */
export function groupContiguousBy<T>(items: T[], keyOf: (item: T) => string): T[][] {
    const groups: T[][] = []
    let chaveAtual: string | null = null

    for (const item of items) {
        const chave = keyOf(item)
        if (groups.length === 0 || chave !== chaveAtual) {
            groups.push([item])
            chaveAtual = chave
        } else {
            groups[groups.length - 1].push(item)
        }
    }

    return groups
}

/**
 * Agrupa pedidos JÁ ORDENADOS por `sequenceOrder`. Ordenar é responsabilidade de
 * quem chama (`getParadasOrdenadas`) — este módulo não reordena itinerário.
 */
export function groupContiguousStops<T extends StopKeyInput>(orderedServices: T[]): T[][] {
    return groupContiguousBy(orderedServices, stopKeyOf)
}

/** Grupo que contém o serviço, ou null. */
export function findGrupoDoServico<T extends StopKeyInput>(
    groups: T[][],
    serviceId: string,
): T[] | null {
    return groups.find((grupo) => grupo.some((s) => s.id === serviceId)) ?? null
}

/**
 * Chaves que aparecem em MAIS DE UM grupo — a mesma porta que o itinerário
 * separou (rota legada ou reordenada à mão). Serve para avisar o motorista na
 * tela, para que não pareça defeito.
 */
export function contarChavesRepetidas(groups: StopKeyInput[][]): Set<string> {
    const vistas = new Set<string>()
    const repetidas = new Set<string>()

    for (const grupo of groups) {
        const primeiro = grupo[0]
        if (!primeiro) continue
        const chave = stopKeyOf(primeiro)
        if (chave.startsWith('solo:')) continue
        if (vistas.has(chave)) {
            repetidas.add(chave)
        } else {
            vistas.add(chave)
        }
    }

    return repetidas
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --ci stopGrouping`
Expected: PASS — 12 testes.

- [ ] **Step 5: Provar por mutação que o teste de contiguidade discrimina**

Backup + hash (PowerShell, uma linha):

```powershell
$f='src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/stopGrouping.ts'; $bak="$env:TEMP\claude\c--Users-daniel-Agility-Front-lab-app\5268d159-4db2-4dae-8125-f082f9a5b9f9\scratchpad\stopGrouping.ts.bak"; Copy-Item -LiteralPath $f $bak; (Get-FileHash -LiteralPath $f -Algorithm MD5).Hash
```

Anote o hash. Mutação (agrupar por chave GLOBAL em vez de vizinhança) — em `groupContiguousBy`, troque o corpo do `for` por:

```ts
        const chave = keyOf(item)
        const existente = groups.find((g) => keyOf(g[0]) === chave)   // MUTAÇÃO
        if (existente) { existente.push(item) } else { groups.push([item]) }
```

Run: `npx jest --ci stopGrouping`
Expected: FAIL em `rota legada: mesma chave NÃO contígua → 2 grupos` (recebe `[['a','b'],['meio']]`).

Restaurar e conferir:

```powershell
$f='src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/stopGrouping.ts'; $bak="$env:TEMP\claude\c--Users-daniel-Agility-Front-lab-app\5268d159-4db2-4dae-8125-f082f9a5b9f9\scratchpad\stopGrouping.ts.bak"; Copy-Item -LiteralPath $bak $f; (Get-FileHash -LiteralPath $f -Algorithm MD5).Hash
```

O hash tem que bater com o anotado. Rode `npx jest --ci stopGrouping` de novo: PASS.

- [ ] **Step 6: Exportar no barrel**

Em `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/index.ts`, no fim do arquivo:

```ts
// ============================================
// AGRUPAMENTO DE PARADAS (Camada 2)
// ============================================

export {
    type StopKeyInput,
    contarChavesRepetidas,
    findGrupoDoServico,
    groupContiguousBy,
    groupContiguousStops,
    stopKeyOf,
} from './stopGrouping'
```

- [ ] **Step 7: Verificar e commitar**

Run: `npx tsc --noEmit && npx jest --ci`
Expected: exit 0; 14 suítes verdes (13 antigas + `stopGrouping`).

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/stopGrouping.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/stopGrouping.test.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/index.ts"
git commit -m "feat(parada): chave de parada e agrupamento por vizinhanca contigua

Fonte unica da resposta a 'estes dois pedidos sao a mesma parada?'. Agrupa
vizinhos contiguos, nunca por afinidade: afinidade reordenaria o itinerario
que o otimizador decidiu. Ainda sem consumidor — o gate (Task 2) e a lista
(Task 4) passam a usar esta mesma funcao para nao discordarem entre si."
```

---

### Task 2: BLOQUEADOR — irmãos da mesma parada não conflitam entre si

Hoje `useStopStatus` decide "uma parada por vez" comparando `service.id` individual. Assim que o app agrupar, o motorista inicia a nota 1 e as notas 2–5 **da mesma porta** contam como "outro serviço em andamento" — e a regra o impede de continuar. Esta task vem **antes** do agrupamento: sozinha ela apenas RELAXA o gate (nunca prende ninguém a mais), e depois dela a Task 4 pode entrar sem janela de travamento.

Esta é a task mais importante do conjunto: é ela que separa "feature entregue" de "motorista travado na primeira nota".

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/useStopStatus.ts:1-126`
- Test: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/__tests__/useStopStatus.test.tsx` (arquivo existe; adicionar um `describe`, não tocar nos 3 testes atuais)

**Interfaces:**
- Consumes: `groupContiguousStops`, `findGrupoDoServico` (Task 1).
- Produces: nenhum símbolo novo. `StopStatus` (`_types/stop.types.ts`) fica igual — `canStartService`, `startBlockReason` e `hasOtherServiceInProgress` mudam de VALOR, não de tipo.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao FIM de `__tests__/useStopStatus.test.tsx` (mantendo tudo que já está lá):

```tsx
/**
 * Camada 2 — "uma parada por vez" com PARADA AGRUPADA.
 *
 * A regra existe para impedir o motorista de abrir duas PORTAS ao mesmo tempo.
 * Com o agrupamento, uma porta tem N notas: iniciar a nota 1 não pode bloquear
 * as notas 2..N da MESMA porta, senão a feature fica inutilizável com
 * `enforceSingleActiveStop` ligado (que é o padrão, opt-out).
 *
 * Irmão = pedido do MESMO GRUPO CONTÍGUO. Contiguidade, não só chave igual: em
 * rota legada dois pedidos do mesmo cliente podem estar separados por outra
 * parada no itinerário, e aí são duas portas de verdade.
 */
describe('useStopStatus — irmãos da mesma parada', () => {
    const MESMA_PORTA = { addressId: 'addr-1', customerId: 'cli-1', serviceType: 'DELIVERY' };
    const OUTRA_PORTA = { addressId: 'addr-9', customerId: 'cli-9', serviceType: 'DELIVERY' };

    it('irmão em atendimento NÃO bloqueia a próxima nota da mesma porta', () => {
        const nota1 = makeService({ id: 'n1', status: ServiceStatus.IN_ATTENDANCE, sequenceOrder: 1, isInAttendance: true, ...MESMA_PORTA });
        const nota2 = makeService({ id: 'n2', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true, ...MESMA_PORTA });

        const result = runHook({
            service: nota2,
            allServices: [nota1, nota2],
            currentServiceId: 'n2',
            enforceSingleActiveStop: true,
            enforceStopOrder: true,
        });

        expect(result.canStartService).toBe(true);
        expect(result.startBlockReason).toBeNull();
        expect(result.hasOtherServiceInProgress).toBe(false);
    });

    it('parada DE OUTRA PORTA em atendimento continua bloqueando', () => {
        const outra = makeService({ id: 'x1', status: ServiceStatus.IN_ATTENDANCE, sequenceOrder: 1, isInAttendance: true, ...OUTRA_PORTA });
        const nota = makeService({ id: 'n1', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true, ...MESMA_PORTA });

        const result = runHook({
            service: nota,
            allServices: [outra, nota],
            currentServiceId: 'n1',
            enforceSingleActiveStop: true,
            enforceStopOrder: true,
        });

        expect(result.canStartService).toBe(false);
        expect(result.startBlockReason).not.toBeNull();
    });

    it('ordem: qualquer nota da parada esperada pode ser iniciada, não só a primeira', () => {
        const nota1 = makeService({ id: 'n1', status: ServiceStatus.PENDING, sequenceOrder: 1, isPending: true, ...MESMA_PORTA });
        const nota2 = makeService({ id: 'n2', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true, ...MESMA_PORTA });

        const result = runHook({
            service: nota2,
            allServices: [nota1, nota2],
            currentServiceId: 'n2',
            enforceSingleActiveStop: true,
            enforceStopOrder: true,
        });

        expect(result.canStartService).toBe(true);
        expect(result.startBlockReason).toBeNull();
    });

    it('pular para OUTRA porta fora de ordem continua bloqueado', () => {
        const primeira = makeService({ id: 'p1', status: ServiceStatus.PENDING, sequenceOrder: 1, isPending: true, ...MESMA_PORTA });
        const adiante = makeService({ id: 'p9', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true, ...OUTRA_PORTA });

        const result = runHook({
            service: adiante,
            allServices: [primeira, adiante],
            currentServiceId: 'p9',
            enforceSingleActiveStop: true,
            enforceStopOrder: true,
        });

        expect(result.canStartService).toBe(false);
        expect(result.startBlockReason).toContain('ordem');
    });

    it('rota legada: mesma porta NÃO contígua são duas paradas — e uma bloqueia a outra', () => {
        // Itinerário: porta A (seq 1) → porta B (seq 2) → porta A de novo (seq 3).
        // O otimizador separou; o app respeita. 'a1' em atendimento bloqueia 'a2'.
        const a1 = makeService({ id: 'a1', status: ServiceStatus.IN_ATTENDANCE, sequenceOrder: 1, isInAttendance: true, ...MESMA_PORTA });
        const b1 = makeService({ id: 'b1', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true, ...OUTRA_PORTA });
        const a2 = makeService({ id: 'a2', status: ServiceStatus.PENDING, sequenceOrder: 3, isPending: true, ...MESMA_PORTA });

        const result = runHook({
            service: a2,
            allServices: [a1, b1, a2],
            currentServiceId: 'a2',
            enforceSingleActiveStop: true,
            enforceStopOrder: true,
        });

        expect(result.canStartService).toBe(false);
        expect(result.hasOtherServiceInProgress).toBe(true);
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --ci useStopStatus`
Expected: FAIL — 2 testes vermelhos (`irmão em atendimento NÃO bloqueia...` e `ordem: qualquer nota...`); os 3 antigos e os outros 3 novos passam. Se `makeService` reclamar dos campos novos, ajuste a assinatura do factory só no `Partial` (Step 3 adiciona os campos ao tipo `Service`).

- [ ] **Step 3: Implementar**

Em `useStopStatus.ts`, ampliar a interface local `Service` (linhas 7-17) com os campos que identificam a parada:

```ts
interface Service {
    id: string;
    status: ServiceStatus;
    sequenceOrder?: number | null;
    isPending?: boolean;
    isInProgress?: boolean;
    isInAttendance?: boolean;
    isCompleted?: boolean;
    isCanceled?: boolean;
    isFailed?: boolean;
    // Identificam a PARADA (a porta), não o pedido. Opcionais: um caller que não
    // os passe cai no comportamento antigo (cada pedido é a sua própria parada).
    addressId?: string | null;
    customerId?: string | null;
    fantasyName?: string | null;
    responsible?: string | null;
    serviceType?: string | null;
}
```

Adicionar o import (junto dos demais imports relativos):

```ts
import { findGrupoDoServico, groupContiguousStops } from '../../../_utils/stopGrouping';
```

Dentro do `useMemo`, logo depois de `const isCanceled = ...` (linha 69), inserir:

```ts
        // Irmãos = pedidos da MESMA PARADA (mesmo grupo contíguo). Com a Camada 2
        // uma porta tem N notas; iniciar a nota 1 não pode contar como "outra
        // parada em andamento" para as notas 2..N, senão a regra "uma por vez"
        // trava o motorista na primeira nota. Usa a MESMA função que monta a
        // lista da tela — se divergissem, o gate bloquearia algo que a tela
        // mostra como uma parada só, e o motorista não teria como entender.
        const ordenados = [...allServices].sort(
            (a, b) => (a.sequenceOrder ?? Number.MAX_SAFE_INTEGER) - (b.sequenceOrder ?? Number.MAX_SAFE_INTEGER),
        );
        const grupoAtual = findGrupoDoServico(groupContiguousStops(ordenados), currentServiceId);
        // Sem grupo (serviço ainda não carregado na lista da rota) → só ele mesmo,
        // que é exatamente o comportamento anterior à Camada 2.
        const irmaosIds = new Set<string>(
            grupoAtual ? grupoAtual.map((s) => s.id) : [currentServiceId],
        );
```

Trocar o predicado de "outra em execução" (linhas 72-79) por:

```ts
        // Outra PARADA em execução (a caminho OU em atendimento) — irmãos não contam.
        const hasOtherServiceInProgress = allServices.some(
            (s) =>
                !irmaosIds.has(s.id) &&
                (s.isInProgress === true ||
                    s.isInAttendance === true ||
                    s.status === ServiceStatus.IN_PROGRESS ||
                    s.status === ServiceStatus.IN_ATTENDANCE),
        );
```

E a checagem de ordem (linha 85) por:

```ts
        // "Próxima esperada" é a próxima PARADA: qualquer nota dela serve para
        // iniciar. `irmaosIds` sempre contém o serviço atual, então isto também
        // cobre o caso de 1 pedido por parada.
        const isNextInOrder = !nextExpected || irmaosIds.has(nextExpected.id);
```

`canCompleteRouting` continua olhando pedido a pedido: a rota só fecha quando TODOS os pedidos fecham — não muda.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --ci useStopStatus`
Expected: PASS — 8 testes (3 antigos + 5 novos).

- [ ] **Step 5: Provar por mutação (obrigatório)**

Backup + hash:

```powershell
$f='src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/useStopStatus.ts'; $bak="$env:TEMP\claude\c--Users-daniel-Agility-Front-lab-app\5268d159-4db2-4dae-8125-f082f9a5b9f9\scratchpad\useStopStatus.ts.bak"; Copy-Item -LiteralPath $f $bak; (Get-FileHash -LiteralPath $f -Algorithm MD5).Hash
```

**Mutação A — apagar a regra dos irmãos no "uma por vez":** trocar `!irmaosIds.has(s.id)` por `s.id !== currentServiceId`.
Run: `npx jest --ci useStopStatus` → Expected: FAIL em `irmão em atendimento NÃO bloqueia a próxima nota da mesma porta`.
Restaurar do backup e conferir o MD5 (mesmo comando, invertendo origem e destino). Rodar de novo: PASS.

**Mutação B — apagar a regra dos irmãos na ordem:** trocar `irmaosIds.has(nextExpected.id)` por `nextExpected.id === currentServiceId`.
Run: `npx jest --ci useStopStatus` → Expected: FAIL em `ordem: qualquer nota da parada esperada pode ser iniciada`.
Restaurar do backup e conferir o MD5. Rodar de novo: PASS.

Uma mutação de cada vez. Se alguma NÃO ficar vermelha, o teste não discrimina — corrija o teste antes de seguir.

- [ ] **Step 6: Verificar e commitar**

Run: `npx tsc --noEmit && npx jest --ci`
Expected: exit 0, tudo verde.

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/useStopStatus.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_hooks/__tests__/useStopStatus.test.tsx"
git commit -m "fix(parada): irmaos da mesma parada nao conflitam em 'uma por vez'

A regra existe para impedir duas PORTAS abertas ao mesmo tempo, mas comparava
service.id individual. Com a parada agrupada, iniciar a nota 1 faria as notas
2..N da mesma porta contarem como 'outro servico em andamento' e travaria o
motorista na primeira nota. Irmao = mesmo grupo CONTIGUO (mesma funcao que
monta a lista da tela). Vem antes do agrupamento de proposito: sozinha esta
mudanca so relaxa o gate, nunca prende ninguem a mais."
```

---

### Task 3: Blindar `findOutrasParadas` — comparar por `serviceId`, não por referência

`findOutrasParadas` exclui a próxima parada com `p !== proximaParada` (identidade de objeto). Funciona hoje porque os dois `useMemo` compartilham o mesmo array. Com o agrupamento reconstruindo arrays, quebra **em silêncio**: a próxima parada aparece duplicada na lista. Entra antes da Task 4 para que a blindagem possa ser revisada isolada do agrupamento.

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/routeCalculations.ts:323-332`
- Test: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/paradaAgrupada.test.ts` (criar; a Task 4 continua nele)

**Interfaces:**
- Produces: `findOutrasParadas(paradas: Parada[], proximaParada: Parada | null): Parada[]` — assinatura idêntica, semântica de comparação diferente.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/paradaAgrupada.test.ts`:

```ts
import type { Parada } from '../../_types/rota.types'
import { findOutrasParadas } from '../routeCalculations'

function parada(over: Partial<Parada> & { serviceId: string }): Parada {
    return {
        numero: 1,
        nome: 'Cliente',
        endereco: 'Rua X',
        horarioInicio: '--:--',
        horarioFim: '--:--',
        tipo: 'Entrega',
        status: 'pendente',
        pedidos: [],
        chaveParada: `addr:1|cli:${over.serviceId}`,
        ...over,
    } as Parada
}

describe('findOutrasParadas', () => {
    it('exclui a próxima parada por serviceId, mesmo sendo outro objeto', () => {
        // Com o agrupamento, `paradas` é reconstruída a cada render: a próxima
        // parada pode ser um objeto DIFERENTE com o mesmo serviceId. Comparar por
        // referência a deixaria aparecer duas vezes na lista, em silêncio.
        const a = parada({ serviceId: 'a' })
        const b = parada({ serviceId: 'b' })
        const proximaClonada = { ...a }

        const outras = findOutrasParadas([a, b], proximaClonada)

        expect(outras.map((p) => p.serviceId)).toEqual(['b'])
    })

    it('sem próxima parada, devolve todas as ativas', () => {
        const a = parada({ serviceId: 'a', status: 'pendente' })
        const b = parada({ serviceId: 'b', status: 'concluida-sucesso' })
        expect(findOutrasParadas([a, b], null).map((p) => p.serviceId)).toEqual(['a'])
    })
})
```

> Nota: `pedidos` e `chaveParada` só existem em `Parada` a partir da Task 4. Até lá, o `as Parada` do factory já cobre — o `tsc` não reclama porque o cast é explícito. Na Task 4 os campos passam a existir de verdade e o cast continua válido.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --ci paradaAgrupada`
Expected: FAIL no primeiro teste — recebe `['a','b']` (o clone não é excluído).

- [ ] **Step 3: Implementar**

Em `routeCalculations.ts`, substituir o corpo de `findOutrasParadas`:

```ts
export function findOutrasParadas(paradas: Parada[], proximaParada: Parada | null): Parada[] {
    if (!paradas || paradas.length === 0) {
        return []
    }

    // Compara por serviceId, não por referência de objeto: com o agrupamento a
    // lista de paradas é reconstruída entre os useMemo, e `p !== proximaParada`
    // deixaria a próxima parada aparecer duas vezes na lista, sem erro nenhum na tela.
    return paradas.filter(p =>
        p.serviceId !== proximaParada?.serviceId &&
        (p.status === 'pendente' || p.status === 'em-andamento' || p.status === 'em-atendimento')
    )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest --ci paradaAgrupada`
Expected: PASS — 2 testes.

- [ ] **Step 5: Verificar e commitar**

Run: `npx tsc --noEmit && npx jest --ci`

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/routeCalculations.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/paradaAgrupada.test.ts"
git commit -m "fix(rota): findOutrasParadas compara por serviceId, nao por referencia

Com o agrupamento a lista de paradas passa a ser reconstruida entre os useMemo,
e a comparacao por identidade de objeto deixaria a proxima parada aparecer duas
vezes na lista — sem erro visivel. Blindagem antes do agrupamento entrar."
```

---

### Task 4: `Parada` ganha `pedidos[]` — o app passa a agrupar

Agora o motorista vê 26 no lugar de 56. Só é seguro porque a Task 2 já está commitada.

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_types/rota.types.ts:74-136`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/statusMappers.ts:95-229`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/routeCalculations.ts:82-85`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/index.ts`
- Test: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/paradaAgrupada.test.ts` (continua)

**Interfaces:**
- Consumes: `groupContiguousStops`, `stopKeyOf`, `contarChavesRepetidas` (Task 1); `getParadasOrdenadas` (já existe).
- Produces:
  - `Parada` ganha: `pedidos: ServiceResponse[]`, `chaveParada: string`, `enderecoRepetido?: boolean`.
  - `getParadaStatusGrupo(grupo: ServiceResponse[]): ParadaStatus`
  - `mapGrupoToParada(grupo: ServiceResponse[], index: number, returnAddress?: string | null): Parada`
  - `mapServiceToParada(service, index, returnAddress?)` — mantida, agora delega para `mapGrupoToParada([service], ...)`.
  - `mapServicesToParadas(services: ServiceResponse[], returnAddress?: string | null): Parada[]` — mesma assinatura, agora agrupa.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar a `__tests__/paradaAgrupada.test.ts` (mantendo os testes da Task 3):

```ts
import { ServiceType } from '@/domain/agility/service/dto/types'
import type { ServiceResponse } from '@/domain/agility/service/dto'

import { hasMultipleParadasEmAndamento, mapServicesToParadas } from '../routeCalculations'

function pedido(over: Partial<ServiceResponse> & { id: string }): ServiceResponse {
    return {
        addressId: 'addr-1',
        customerId: 'cli-1',
        fantasyName: 'SAO LUIZ CRATO',
        responsible: null,
        serviceType: ServiceType.DELIVERY,
        status: 'PENDING',
        isPending: true,
        isInProgress: false,
        isInAttendance: false,
        isCompleted: false,
        isCanceled: false,
        isFailed: false,
        sequenceOrder: 0,
        address: { formattedAddress: 'Rua X, 100' },
        ...over,
    } as unknown as ServiceResponse
}

describe('mapServicesToParadas — agrupamento', () => {
    it('5 pedidos contíguos na mesma porta → 1 parada com 5 pedidos', () => {
        const services = [0, 1, 2, 3, 4].map((i) => pedido({ id: `n${i}`, sequenceOrder: i }))
        const paradas = mapServicesToParadas(services)

        expect(paradas).toHaveLength(1)
        expect(paradas[0].pedidos).toHaveLength(5)
        expect(paradas[0].numero).toBe(1)
        // serviceId é o do REPRESENTANTE (primeiro do grupo) — invariante aditiva.
        expect(paradas[0].serviceId).toBe('n0')
    })

    it('2 clientes no mesmo endereço → 2 paradas (dois recebedores, dois canhotos)', () => {
        const paradas = mapServicesToParadas([
            pedido({ id: 'a', sequenceOrder: 0, customerId: 'cli-1' }),
            pedido({ id: 'b', sequenceOrder: 1, customerId: 'cli-2' }),
        ])
        expect(paradas).toHaveLength(2)
        expect(paradas.map((p) => p.numero)).toEqual([1, 2])
    })

    it('rota legada (não contíguos) → 2 paradas, e ambas marcadas como endereço repetido', () => {
        const paradas = mapServicesToParadas([
            pedido({ id: 'a', sequenceOrder: 0 }),
            pedido({ id: 'meio', sequenceOrder: 1, addressId: 'addr-2', customerId: 'cli-2' }),
            pedido({ id: 'b', sequenceOrder: 2 }),
        ])
        expect(paradas).toHaveLength(3)
        expect(paradas[0].enderecoRepetido).toBe(true)
        expect(paradas[1].enderecoRepetido).toBeFalsy()
        expect(paradas[2].enderecoRepetido).toBe(true)
    })

    it('parada de 1 pedido continua idêntica ao comportamento atual', () => {
        const [parada] = mapServicesToParadas([pedido({ id: 'unico', sequenceOrder: 0 })])
        expect(parada.serviceId).toBe('unico')
        expect(parada.pedidos).toHaveLength(1)
        expect(parada.status).toBe('pendente')
        expect(parada.enderecoRepetido).toBeFalsy()
    })
})

describe('status agregado da parada (§3.2 / §3.3)', () => {
    const grupoCom = (overrides: Partial<ServiceResponse>[]) =>
        mapServicesToParadas(overrides.map((o, i) => pedido({ id: `n${i}`, sequenceOrder: i, ...o })))[0]

    it('4 entregues + 1 pendente → parada PENDENTE (só fecha quando todas fecharem)', () => {
        const parada = grupoCom([
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isPending: true },
        ])
        expect(parada.status).toBe('pendente')
    })

    it('algum em atendimento vence algum em andamento', () => {
        const parada = grupoCom([
            { isInProgress: true, isPending: false, status: 'IN_PROGRESS' },
            { isInAttendance: true, isPending: false, status: 'IN_ATTENDANCE' },
        ])
        expect(parada.status).toBe('em-atendimento')
    })

    it('todas entregues → concluída com sucesso', () => {
        const parada = grupoCom([
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
        ])
        expect(parada.status).toBe('concluida-sucesso')
    })

    it('3 entregues + 2 insucesso → grupo misto cai em INSUCESSO', () => {
        const parada = grupoCom([
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isFailed: true, isPending: false, status: 'FAILED' },
            { isFailed: true, isPending: false, status: 'FAILED' },
        ])
        expect(parada.status).toBe('concluida-insucesso')
        expect(parada.pedidos.filter((p) => p.isCompleted).length).toBe(3)
    })
})

describe('janela de tempo da parada (§3.4)', () => {
    it('exibe a mais restritiva do grupo: último início e primeiro fim', () => {
        const [parada] = mapServicesToParadas([
            pedido({ id: 'a', sequenceOrder: 0, promisedStartDate: '2026-07-30T08:00:00.000Z', promisedEndDate: '2026-07-30T18:00:00.000Z' }),
            pedido({ id: 'b', sequenceOrder: 1, promisedStartDate: '2026-07-30T10:00:00.000Z', promisedEndDate: '2026-07-30T12:00:00.000Z' }),
        ])
        expect(parada.promisedStartISO).toBe('2026-07-30T10:00:00.000Z')
        expect(parada.promisedEndISO).toBe('2026-07-30T12:00:00.000Z')
    })

    it('ignora nulos; sem nenhuma janela no grupo, fica null', () => {
        const [parada] = mapServicesToParadas([
            pedido({ id: 'a', sequenceOrder: 0, promisedStartDate: null, promisedEndDate: null }),
            pedido({ id: 'b', sequenceOrder: 1, promisedStartDate: null, promisedEndDate: '2026-07-30T12:00:00.000Z' }),
        ])
        expect(parada.promisedStartISO).toBeNull()
        expect(parada.promisedEndISO).toBe('2026-07-30T12:00:00.000Z')
    })
})

describe('hasMultipleParadasEmAndamento', () => {
    it('duas notas da MESMA porta em andamento não são "múltiplas paradas"', () => {
        // Antes do agrupamento isto disparava falso positivo o tempo todo durante
        // o atendimento de uma porta com várias notas.
        const paradas = mapServicesToParadas([
            pedido({ id: 'a', sequenceOrder: 0, isInProgress: true, isPending: false, status: 'IN_PROGRESS' }),
            pedido({ id: 'b', sequenceOrder: 1, isInProgress: true, isPending: false, status: 'IN_PROGRESS' }),
        ])
        expect(paradas).toHaveLength(1)
        expect(hasMultipleParadasEmAndamento(paradas)).toBe(false)
    })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --ci paradaAgrupada`
Expected: FAIL — `paradas` tem 5 itens onde se espera 1, `pedidos` é `undefined`, etc.

- [ ] **Step 3: Ampliar o tipo `Parada`**

Em `_types/rota.types.ts`, dentro de `interface Parada`, logo depois de `serviceId` (linha 79):

```ts
    /**
     * Pedidos desta parada, na ordem do itinerário. SEMPRE tem ao menos 1.
     * `serviceId` acima é o do REPRESENTANTE (`pedidos[0]`) — o agrupamento é
     * aditivo justamente para que quem só lê `serviceId` continue funcionando.
     */
    pedidos: ServiceResponse[]

    /** Chave de agrupamento (ver `_utils/stopGrouping`). Uso interno/diagnóstico. */
    chaveParada: string

    /**
     * A mesma porta aparece em OUTRA parada da rota. Acontece em rota legada
     * (planejada antes da Camada 1) ou reordenada à mão: os pedidos não estão
     * contíguos e o app não funde o que o itinerário separou. Serve para avisar
     * o motorista — é comportamento correto, mas parece defeito.
     */
    enderecoRepetido?: boolean
```

- [ ] **Step 4: Implementar o mapeamento do grupo**

Em `statusMappers.ts`, adicionar depois de `getParadaStatus` (linha 117):

```ts
/**
 * Status da PARADA a partir dos N pedidos (§3.2 da spec).
 *
 * Precedência: em atendimento > em andamento > pendente > terminal. Uma parada
 * só fecha quando TODOS os pedidos fecham; e grupo misto (alguns entregues,
 * algum insucesso) fecha como INSUCESSO — é o recorte que não esconde o
 * problema do operador (§3.3).
 */
export function getParadaStatusGrupo(grupo: ServiceResponse[]): ParadaStatus {
    if (grupo.length === 0) return 'pendente'

    const status = grupo.map(getParadaStatus)

    if (status.includes('em-atendimento')) return 'em-atendimento'
    if (status.includes('em-andamento')) return 'em-andamento'
    if (status.includes('pendente')) return 'pendente'
    if (status.includes('concluida-insucesso')) return 'concluida-insucesso'
    return 'concluida-sucesso'
}

/** Janela mais restritiva do grupo: o início mais tarde e o fim mais cedo (§3.4). */
function janelaMaisRestritiva(grupo: ServiceResponse[]): { inicio: string | null; fim: string | null } {
    const inicios = grupo.map((s) => toISO(s.promisedStartDate)).filter((v): v is string => !!v)
    const fins = grupo.map((s) => toISO(s.promisedEndDate)).filter((v): v is string => !!v)

    return {
        inicio: inicios.length ? inicios.reduce((a, b) => (a > b ? a : b)) : null,
        fim: fins.length ? fins.reduce((a, b) => (a < b ? a : b)) : null,
    }
}
```

Trocar `mapServiceToParada` por `mapGrupoToParada` mantendo a antiga como caso de 1 pedido. Substituir o `return` de `mapServiceToParada` (linhas 205-229) e a assinatura, ficando:

```ts
/**
 * Mapeia UM GRUPO de pedidos (a parada) para `Parada`.
 *
 * O representante (`grupo[0]`, o primeiro do itinerário) fornece endereço, nome,
 * tipo e ETA de chegada. O que é agregado vem do grupo inteiro: status (§3.2),
 * janela (§3.4), conclusão real e pendência.
 */
export function mapGrupoToParada(
    grupo: ServiceResponse[],
    index: number,
    returnAddress?: string | null,
): Parada {
    const service = grupo[0]
    const numero = index + 1

    const isRetorno = service.serviceType === ServiceType.RETURN

    const isTransferAB = service.serviceType === ServiceType.TRANSFER
        && (!!service.pickupAddress || !!service.deliveryAddress)
    const enderecoColeta = isTransferAB ? formatAddress(service.pickupAddress) : null
    const enderecoEntrega = isTransferAB ? formatAddress(service.deliveryAddress) : null

    const endereco = isRetorno
        ? (returnAddress ?? 'Retorno ao CD/origem')
        : isTransferAB
            ? `Coleta: ${enderecoColeta} · Entrega: ${enderecoEntrega}`
            : (service.address?.formattedAddress
                ?? (service.addressId ? `Endereço ID: ${service.addressId}` : 'Endereço não disponível'))

    // Chegada = a do primeiro pedido; conclusão = a do último. A parada dura da
    // primeira nota à última.
    const ultimo = grupo[grupo.length - 1]
    const horarioInicio = formatHHmm(service.estimatedArrival)
    const horarioFim = formatHHmm(ultimo.estimatedCompletion)

    const tipo = getServiceTypeLabel(service.serviceType)
    const status = getParadaStatusGrupo(grupo)
    const janela = janelaMaisRestritiva(grupo)

    const hasReturn = grupo.some((s) => !!(
        s.hasReturn ||
        (s.materials?.some((m) => m.direction === 'PICKUP') ?? false)
    ))

    // Conclusão da PARADA = a do último pedido a fechar.
    const conclusoes = grupo
        .map((s) => toISO(s.completedAt ?? s.endDate))
        .filter((v): v is string => !!v)
    const completedAtISO = conclusoes.length ? conclusoes.reduce((a, b) => (a > b ? a : b)) : null

    // Qualquer pendência de item no grupo marca a parada como "com pendência".
    const deliveryOutcome = grupo.some((s) => s.deliveryOutcome === 'WITH_ISSUES')
        ? 'WITH_ISSUES'
        : (grupo.some((s) => s.deliveryOutcome === 'FULL') ? 'FULL' : null)

    return {
        numero,
        serviceId: service.id,
        pedidos: grupo,
        chaveParada: stopKeyOf(service),
        nome: isRetorno ? 'Retorno' : (service.fantasyName ?? service.responsible ?? 'Cliente'),
        endereco,
        enderecoColeta,
        enderecoEntrega,
        horarioInicio,
        horarioFim,
        estimatedArrivalISO: toISO(service.estimatedArrival),
        plannedArrivalISO: toISO(service.plannedArrival),
        promisedStartISO: janela.inicio,
        promisedEndISO: janela.fim,
        completedAtISO,
        isLateToEta: service.isLateToEta ?? undefined,
        isLateToWindow: service.isLateToWindow ?? undefined,
        delayMinutes: service.delayMinutes ?? null,
        tipo,
        hasReturn,
        isRetorno,
        status,
        deliveryOutcome,
    }
}

/** Compatibilidade: um pedido é uma parada de um pedido só. */
export function mapServiceToParada(
    service: ServiceResponse,
    index: number,
    returnAddress?: string | null,
): Parada {
    return mapGrupoToParada([service], index, returnAddress)
}
```

Adicionar o import no topo de `statusMappers.ts`:

```ts
import { stopKeyOf } from './stopGrouping'
```

- [ ] **Step 5: Agrupar em `mapServicesToParadas`**

Em `routeCalculations.ts`, substituir `mapServicesToParadas` (linhas 82-85) e ajustar os imports:

```ts
import { contarChavesRepetidas, groupContiguousStops } from './stopGrouping'
import { mapGrupoToParada } from './statusMappers'
```

```ts
/**
 * Converte a lista de PEDIDOS na lista de PARADAS ordenadas.
 *
 * Agrupa vizinhos CONTÍGUOS com a mesma chave de parada — nunca por afinidade,
 * que reordenaria o itinerário. A numeração passa a ser por parada: "12 de 26",
 * não "12 de 56".
 */
export function mapServicesToParadas(services: ServiceResponse[], returnAddress?: string | null): Parada[] {
    const sortedServices = getParadasOrdenadas(services)
    const grupos = groupContiguousStops(sortedServices)
    // A mesma porta partida em mais de um grupo é comportamento CORRETO em rota
    // legada — mas precisa ficar visível ao motorista para não parecer defeito.
    const chavesRepetidas = contarChavesRepetidas(grupos)

    return grupos.map((grupo, index) => {
        const parada = mapGrupoToParada(grupo, index, returnAddress)
        return chavesRepetidas.has(parada.chaveParada)
            ? { ...parada, enderecoRepetido: true }
            : parada
    })
}
```

> `getParadasOrdenadas` continua ordenando por `sequenceOrder` e não muda.

- [ ] **Step 6: Exportar os símbolos novos**

Em `_utils/index.ts`, no bloco de STATUS MAPPERS, adicionar `getParadaStatusGrupo` e `mapGrupoToParada` à lista já existente.

- [ ] **Step 7: Rodar e ver passar**

Run: `npx jest --ci paradaAgrupada`
Expected: PASS — 13 testes (2 da Task 3 + 11 novos).

- [ ] **Step 8: Provar por mutação que o status agregado discrimina**

Backup + hash de `statusMappers.ts` (mesmo padrão dos steps anteriores).
**Mutação:** em `getParadaStatusGrupo`, trocar o corpo por `return getParadaStatus(grupo[0])` (status só do representante).
Run: `npx jest --ci paradaAgrupada` → Expected: FAIL em `4 entregues + 1 pendente → parada PENDENTE` e em `3 entregues + 2 insucesso`.
Restaurar do backup, conferir o MD5, rodar de novo: PASS.

- [ ] **Step 9: Verificar e commitar**

Run: `npx tsc --noEmit && npx jest --ci`
Expected: exit 0. **Se algum teste antigo ficar vermelho aqui, LEIA antes de mexer** — provavelmente codificava 1 parada = 1 pedido; reescreva registrando o motivo no comentário.

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_types/rota.types.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/statusMappers.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/routeCalculations.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/index.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/paradaAgrupada.test.ts"
git commit -m "feat(parada): uma parada por porta — Parada ganha pedidos[]

mapServicesToParadas agrupa pedidos contiguos da mesma porta/cliente. Aditivo:
serviceId continua existindo (agora o do pedido representante), entao quem so
le Parada nao muda. Status agrega os N (fecha so quando todos fecharem; grupo
misto cai em insucesso) e a janela exibida e a mais restritiva. Rota legada com
irmaos nao contiguos vira duas paradas — marcado em enderecoRepetido para
avisar o motorista."
```

---

### Task 5: Tela da parada vira índice quando N>1

Cada nota tem canhoto próprio. A tela da parada lista os N pedidos e cada um abre o fluxo de entrega **que já existe, intocado**. Parada de 1 pedido segue direto, sem tela intermediária.

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/index.tsx:38-182` e o corpo do render
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferOrderCard.tsx:29-53`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferOrderList.tsx:15-45`

**Interfaces:**
- Consumes: `groupContiguousStops`, `findGrupoDoServico` (Task 1); `mapGrupoToParada` (Task 4); `getParadaStatusLabel` (já existe).
- Produces:
  - `TransferOrderCard` ganha props opcionais: `titulo?: string`, `subtitulo?: string`, `badge?: string`, `onOpen?: () => void`, `openLabel?: string`.
  - `TransferOrderList` ganha props opcionais: `titulo?: string`, `onOpen?: (serviceId: string) => void`, `openLabel?: string`, `tituloDeCard?`, `subtituloDeCard?`, `badgeDeCard?`.

- [ ] **Step 1: Props aditivas no `TransferOrderCard`**

Trocar a assinatura (linhas 29-39) por:

```tsx
export function TransferOrderCard({
    parada,
    outcome,
    onMarkNotReceived,
    onMarkReceived,
    titulo,
    subtitulo,
    badge,
    onOpen,
    openLabel = 'Abrir',
}: {
    parada: Parada;
    outcome?: TransferOrderOutcome;
    onMarkNotReceived?: () => void;
    onMarkReceived?: () => void;
    /** Sobrescreve o título (na parada agrupada é o nº da nota / código do pedido). */
    titulo?: string;
    /** Sobrescreve o subtítulo (na parada agrupada é a janela contratada da nota). */
    subtitulo?: string;
    /** Etiqueta curta de status da nota (ex.: "Entregue", "Insucesso"). */
    badge?: string;
    /** CTA que abre o fluxo daquele pedido. Sem ela o card permanece como era. */
    onOpen?: () => void;
    openLabel?: string;
}) {
```

Usar os overrides no cabeçalho do card (linhas 48-51):

```tsx
                <Box flex={1}>
                    <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">{titulo ?? parada.nome}</Text>
                    <Text preset="text12" color="gray600">{subtitulo ?? parada.endereco}</Text>
                </Box>
                {badge ? (
                    <Box backgroundColor="gray100" px="x8" py="y2" borderRadius="s4">
                        <Text preset="text12" color="gray600">{badge}</Text>
                    </Box>
                ) : null}
```

E adicionar o CTA logo antes do bloco `{expanded ? ... }`:

```tsx
            {onOpen ? (
                <Box borderTopWidth={1} borderColor="gray100" px="x12" py="y8">
                    <TouchableOpacityBox onPress={onOpen} alignSelf="flex-start">
                        <Text preset="text13" fontWeightPreset="semibold" color="primary100">{openLabel}</Text>
                    </TouchableOpacityBox>
                </Box>
            ) : null}
```

- [ ] **Step 2: Props aditivas no `TransferOrderList`**

```tsx
export function TransferOrderList({
    paradas,
    outcomes,
    onMarkNotReceived,
    onMarkReceived,
    titulo,
    onOpen,
    openLabel,
    tituloDeCard,
    subtituloDeCard,
    badgeDeCard,
}: {
    paradas: Parada[];
    outcomes?: Record<string, TransferOrderOutcome>;
    onMarkNotReceived?: (serviceId: string) => void;
    onMarkReceived?: (serviceId: string) => void;
    /** Cabeçalho da lista. Default: "Lote da carga (N pedidos)". */
    titulo?: string;
    onOpen?: (serviceId: string) => void;
    openLabel?: string;
    tituloDeCard?: (parada: Parada, index: number) => string;
    subtituloDeCard?: (parada: Parada, index: number) => string | undefined;
    badgeDeCard?: (parada: Parada, index: number) => string | undefined;
}) {
    return (
        <Box gap="y8">
            <Text preset="text14" fontWeightPreset="bold" color="gray600">
                {titulo ?? `Lote da carga (${paradas.length} pedido${paradas.length === 1 ? '' : 's'})`}
            </Text>
            {paradas.length === 0 ? (
                <Text preset="text13" color="gray600">Nenhum pedido no lote deste trecho.</Text>
            ) : null}
            {paradas.map((parada, index) => (
                <TransferOrderCard
                    key={parada.serviceId}
                    parada={parada}
                    outcome={outcomes?.[parada.serviceId]}
                    titulo={tituloDeCard?.(parada, index)}
                    subtitulo={subtituloDeCard?.(parada, index)}
                    badge={badgeDeCard?.(parada, index)}
                    onOpen={onOpen ? () => onOpen(parada.serviceId) : undefined}
                    openLabel={openLabel}
                    onMarkNotReceived={onMarkNotReceived ? () => onMarkNotReceived(parada.serviceId) : undefined}
                    onMarkReceived={onMarkReceived ? () => onMarkReceived(parada.serviceId) : undefined}
                />
            ))}
        </Box>
    );
}
```

- [ ] **Step 3: Índice na tela da parada**

Em `[id]/parada/[pid]/index.tsx`:

(a) capturar o loading dos serviços (linha 40) — sem isso o `useEffect` redireciona antes de saber que a parada tem N notas:

```tsx
  const { services: allServices, isLoading: isLoadingServices } = useFindServicesByRoutingId(routeId || '');
```

(b) calcular o grupo, logo depois de `serviceFromList` (linha 43):

```tsx
  // Pedidos DESTA parada (mesma porta, contíguos). Mesma função que monta a lista
  // da rota e que o gate de "uma por vez" usa — as três precisam concordar.
  const pedidosDaParada = useMemo(() => {
    const ordenados = [...allServices].sort(
      (a, b) => (a.sequenceOrder ?? 999) - (b.sequenceOrder ?? 999),
    );
    return findGrupoDoServico(groupContiguousStops(ordenados), serviceId) ?? [];
  }, [allServices, serviceId]);

  const isParadaAgrupada = pedidosDaParada.length > 1;

  // Cada nota é uma "parada de 1 pedido" para o card — inclusive o status dela.
  const notas = useMemo(
    () => pedidosDaParada.map((p, i) => mapGrupoToParada([p], i, null)),
    [pedidosDaParada],
  );
```

Imports novos no topo:

```tsx
import { useMemo } from 'react';   // acrescentar ao import existente de 'react'
import { TransferOrderList } from '../../_components/TransferOrderList';
import { findGrupoDoServico, groupContiguousStops, mapGrupoToParada, getParadaStatusLabel } from '../../_utils';
```

(c) travar o auto-redirect quando for índice — no início do `useEffect` (linha 130):

```tsx
    if (isLoading || isError || !service) return;
    // Parada agrupada: esta tela é o ÍNDICE das notas. Só redireciona quando a
    // parada tem 1 pedido (comportamento idêntico ao de hoje). O guard de
    // isLoadingServices evita redirecionar antes de saber quantas notas são.
    if (isLoadingServices || isParadaAgrupada) return;
```

e acrescentar `isLoadingServices, isParadaAgrupada` ao array de dependências do efeito.

(d) renderizar o índice — logo antes do `return` principal (antes da linha 417), inserir:

```tsx
  if (isParadaAgrupada) {
    return (
      <ScreenBase
        scrollable
        buttonLeft={<ButtonBack />}
        title={
          <Text preset="text16" fontWeightPreset="semibold" color="colorTextPrimary" textAlign="center" numberOfLines={2}>
            {addressText}
          </Text>
        }
      >
        <Box flex={1} backgroundColor="white" pt="y8" px="x16" gap="y16">
          <Box>
            <Text preset="text15" fontWeightPreset="semibold" color="colorTextPrimary">{customerName}</Text>
            <Text preset="text13" color="gray600">
              {notas.length} notas nesta parada — confirme uma de cada vez.
            </Text>
          </Box>

          <TransferOrderList
            paradas={notas}
            titulo={`Notas desta parada (${notas.length})`}
            openLabel="Abrir"
            tituloDeCard={(nota, i) => {
              const pedido = pedidosDaParada[i];
              return pedido?.identificationCode
                ? `Nota ${i + 1} · #${pedido.identificationCode}`
                : `Nota ${i + 1}`;
            }}
            subtituloDeCard={(nota) =>
              nota.promisedStartISO || nota.promisedEndISO
                ? `Janela ${formatHHmm(nota.promisedStartISO)}–${formatHHmm(nota.promisedEndISO)}`
                : undefined
            }
            badgeDeCard={(nota) => getParadaStatusLabel(nota.status)}
            onOpen={(pid) => {
              router.push({
                pathname: rotaDaNota,
                params: { id: routeId, pid },
              });
            }}
          />
        </Box>
      </ScreenBase>
    );
  }
```

onde `rotaDaNota` deriva do tipo do serviço com o MESMO mapa do `useEffect` de redirect (DELIVERY→`/rotas-detalhadas/[id]/parada/[pid]/entrega`, PICKUP→`/coleta`, SERVICE→`/service`). O grupo é sempre homogêneo em tipo porque o tipo entra na chave de agrupamento (Task 1), então basta olhar `service.serviceType` uma vez.

- [ ] **Step 4: Verificação**

Run: `npx tsc --noEmit && npx jest --ci`
Expected: exit 0, tudo verde.

Verificação manual (a fazer no app; registre o resultado — **não** afirme que passou sem ter rodado):
1. Parada de 1 pedido → abre direto no fluxo de entrega, sem tela intermediária.
2. Parada de 5 pedidos → abre o índice, 5 cards, cada um com nº da nota e status.
3. Tocar "Abrir" na nota 3 → fluxo de entrega da nota 3; voltar → índice.
4. Com a nota 1 em atendimento, abrir a nota 2 → **não** aparece "Conclua a parada em andamento".

- [ ] **Step 5: Commitar**

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/index.tsx" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferOrderCard.tsx" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/TransferOrderList.tsx"
git commit -m "feat(parada): tela da parada vira indice quando ha mais de uma nota

Cada nota tem canhoto proprio na operacao do cliente, entao a confirmacao e
nota por nota: a tela lista os N pedidos e cada um abre o fluxo de entrega que
ja existe, intocado. Parada de 1 pedido segue direto, sem tela intermediaria.
Reusa TransferOrderCard/List com props opcionais aditivas — o fluxo de
transferencia nao muda."
```

---

### Task 6: Lista da rota — "N notas", insucesso misto e aviso de endereço repetido

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/ParadaListItem.tsx`

**Interfaces:**
- Consumes: `Parada.pedidos`, `Parada.enderecoRepetido` (Task 4).
- Produces: nenhum símbolo novo.

- [ ] **Step 1: Contadores do grupo**

Em `ParadaListItem`, depois de `const statusConfig = ...` (linha 130):

```tsx
    // Uma parada pode ter N notas (mesma porta). Contagem para o card.
    const totalNotas = parada.pedidos?.length ?? 1
    const notasEntregues = parada.pedidos?.filter((p) => p.isCompleted === true).length ?? 0
    const isGrupoMisto = parada.status === 'concluida-insucesso' && notasEntregues > 0
```

- [ ] **Step 2: Badges**

Dentro do `Box` de badges (depois do badge de status, linha 245), acrescentar:

```tsx
                    {totalNotas > 1 && (
                        <Box backgroundColor="gray100" paddingHorizontal="x8" paddingVertical="y2" borderRadius="s4" flexShrink={0}>
                            <Text preset="text13" color="gray600">
                                {isGrupoMisto
                                    ? `${notasEntregues} de ${totalNotas} entregues`
                                    : `${totalNotas} notas`}
                            </Text>
                        </Box>
                    )}
```

E, logo depois desse bloco de badges (antes do `Box marginBottom="y4"`, linha 304), o aviso do risco de contiguidade:

```tsx
                {parada.enderecoRepetido && (
                    <Box marginBottom="y4">
                        <Text preset="text12" color="gray600">
                            ⓘ Este endereço aparece em outra parada da rota — siga a ordem do roteiro.
                        </Text>
                    </Box>
                )}
```

- [ ] **Step 3: Verificar e commitar**

Run: `npx tsc --noEmit && npx jest --ci`

Verificação manual: parada com 5 notas mostra "5 notas"; parada com 3 entregues e 2 insucesso aparece na seção **Concluídas com insucesso** com "3 de 5 entregues"; rota legada mostra o aviso ⓘ nas duas paradas da mesma porta.

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/ParadaListItem.tsx"
git commit -m "feat(rota): card da parada mostra N notas, grupo misto e endereco repetido

Grupo misto (3 entregues, 2 insucesso) aparece na secao de insucesso com
'3 de 5 entregues' — e o recorte que nao esconde o problema do operador. O
aviso de endereco repetido cobre a rota legada, em que os irmaos nao estao
contiguos e a mesma porta vira duas paradas: e o comportamento seguro, mas
sem aviso parece defeito para o motorista."
```

---

### Task 7: Progresso em paradas E em notas

O cliente já opera com a distinção: a planilha tem "Quantidade de entregas" (25) e "Quantidade Total de Notas" (54) como colunas separadas.

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/routeCalculations.ts` (`ParadaCountResult`, `countParadasByStatus`, `withLedgerNonDelivered`)
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_context/RotaContext.tsx:49-62`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/RouteProgress.tsx:38-46`
- Test: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/paradaAgrupada.test.ts`

**Interfaces:**
- Produces: `ParadaCountResult` ganha `notasTotal: number` e `notasConcluidas: number`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar a `paradaAgrupada.test.ts` (o import de `countParadasByStatus`/`withLedgerNonDelivered` vem do mesmo `../routeCalculations` já importado):

```ts
describe('contagem de paradas e de notas', () => {
    it('conta paradas e notas separadamente (26 paradas, 56 notas)', () => {
        const paradas = mapServicesToParadas([
            pedido({ id: 'a0', sequenceOrder: 0, isCompleted: true, isPending: false, status: 'COMPLETED' }),
            pedido({ id: 'a1', sequenceOrder: 1, isCompleted: true, isPending: false, status: 'COMPLETED' }),
            pedido({ id: 'b0', sequenceOrder: 2, addressId: 'addr-2', customerId: 'cli-2' }),
        ])
        const contagem = countParadasByStatus(paradas)

        expect(contagem.total).toBe(2)
        expect(contagem.concluidas).toBe(1)
        expect(contagem.notasTotal).toBe(3)
        expect(contagem.notasConcluidas).toBe(2)
    })

    it('pedido que saiu da rota (ledger) conta como 1 parada e 1 nota', () => {
        const base = countParadasByStatus([])
        const comLedger = withLedgerNonDelivered(base, 2)
        expect(comLedger.total).toBe(2)
        expect(comLedger.notasTotal).toBe(2)
        expect(comLedger.notasConcluidas).toBe(2)
    })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --ci paradaAgrupada`
Expected: FAIL — `notasTotal` é `undefined`.

- [ ] **Step 3: Implementar**

Em `routeCalculations.ts`, na interface `ParadaCountResult`:

```ts
    /** Total de NOTAS (pedidos) — a parada pode ter várias. */
    notasTotal: number
    /** Notas em estado terminal (entregue, cancelada ou insucesso). */
    notasConcluidas: number
```

Em `countParadasByStatus`, inicializar `notasTotal: 0, notasConcluidas: 0` e, dentro do `for`, antes do `switch`:

```ts
        const pedidos = parada.pedidos ?? []
        result.notasTotal += pedidos.length || 1
        result.notasConcluidas += pedidos.filter(
            (p) => p.isCompleted === true || p.isCanceled === true || p.isFailed === true,
        ).length
```

Em `withLedgerNonDelivered`, somar também as notas (cada pedido do ledger é uma nota que saiu da rota):

```ts
    return {
        ...base,
        total: base.total + ledgerOnly,
        concluidasInsucesso: base.concluidasInsucesso + ledgerOnly,
        concluidas: base.concluidas + ledgerOnly,
        notasTotal: base.notasTotal + ledgerOnly,
        notasConcluidas: base.notasConcluidas + ledgerOnly,
    }
```

- [ ] **Step 4: Eliminar a `ParadaCountResult` duplicada**

`RotaContext.tsx` declara a sua própria cópia da interface (linhas 49-62) e faz `contagem as ParadaCountResult`. Com um campo novo, a cópia diverge em silêncio. Trocar a declaração local por:

```ts
import type { ParadaCountResult } from '../_utils'
```

e re-exportar para não quebrar quem importa daqui:

```ts
export type { ParadaCountResult }
```

Remover o `as ParadaCountResult` (linha 379) — o cast deixa de ser necessário.

- [ ] **Step 5: Exibir no `RouteProgress`**

Trocar `textoContagem` (linha 45):

```tsx
    // Paradas e notas são coisas diferentes: 26 portas, 56 notas. O cliente já
    // opera com essa distinção (a planilha tem as duas colunas).
    const textoContagem = contagem.notasTotal > contagem.total
        ? `${contagem.concluidas} de ${contagem.total} paradas · ${contagem.notasConcluidas} de ${contagem.notasTotal} notas`
        : `${contagem.concluidas} de ${contagem.total} concluídas`
```

- [ ] **Step 6: Rodar, verificar e commitar**

Run: `npx jest --ci paradaAgrupada` → PASS
Run: `npx tsc --noEmit && npx jest --ci` → exit 0

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/routeCalculations.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_context/RotaContext.tsx" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_components/RouteProgress.tsx" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/paradaAgrupada.test.ts"
git commit -m "feat(rota): progresso conta paradas E notas

'12 de 26 paradas · 34 de 56 notas'. Sao numeros diferentes e o cliente ja
opera com a distincao. De quebra, RotaContext deixa de manter uma copia da
interface ParadaCountResult, que divergiria em silencio a cada campo novo."
```

---

### Task 8: Mapa — um pino por parada

Cinco pedidos na mesma porta viravam cinco pinos empilhados com números diferentes. Depois desta task a numeração do mapa bate com a da lista.

**Files:**
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/stopGrouping.ts` (chave dos pontos do mapa)
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/index.ts`
- Modify: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/useRouteMapView.ts:115-158`
- Test: `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/stopGrouping.test.ts`

**Interfaces:**
- Produces:
  - `interface MapPointKeyInput { id: string; latitude: number; longitude: number; title?: string | null; serviceType?: string | null }`
  - `mapPointStopKeyOf(point: MapPointKeyInput): string`

> **Por que uma chave diferente:** o endpoint `/map-data` devolve `ServicePointResponse`, que **não tem** `addressId` nem `customerId` (só `id`, `sequenceOrder`, `latitude`, `longitude`, `title`, `serviceType`, `status`). A chave do mapa usa coordenada arredondada + título; é uma aproximação da chave real e por isso mora numa função separada, com o motivo escrito.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar a `stopGrouping.test.ts`:

```ts
describe('mapPointStopKeyOf', () => {
    const ponto = (over: Partial<MapPointKeyInput> & { id: string }): MapPointKeyInput => ({
        latitude: -7.2345678,
        longitude: -39.4098765,
        title: 'SAO LUIZ CRATO',
        serviceType: 'DELIVERY',
        ...over,
    })

    it('mesma coordenada e mesmo título → mesma chave', () => {
        expect(mapPointStopKeyOf(ponto({ id: 'a' }))).toBe(mapPointStopKeyOf(ponto({ id: 'b' })))
    })

    it('coordenadas distintas → chaves distintas', () => {
        expect(mapPointStopKeyOf(ponto({ id: 'a' })))
            .not.toBe(mapPointStopKeyOf(ponto({ id: 'b', latitude: -7.3 })))
    })

    it('sem título não agrupa (não dá para afirmar que é o mesmo recebedor)', () => {
        expect(mapPointStopKeyOf(ponto({ id: 'a', title: null })))
            .not.toBe(mapPointStopKeyOf(ponto({ id: 'b', title: null })))
    })

    it('5 pontos contíguos na mesma porta → 1 pino', () => {
        const pontos = [0, 1, 2, 3, 4].map((i) => ponto({ id: `p${i}` }))
        expect(groupContiguousBy(pontos, mapPointStopKeyOf)).toHaveLength(1)
    })
})
```

Acrescentar `groupContiguousBy`, `mapPointStopKeyOf` e `type MapPointKeyInput` ao import de `../stopGrouping` no topo do arquivo.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --ci stopGrouping`
Expected: FAIL — `mapPointStopKeyOf is not a function`.

- [ ] **Step 3: Implementar a chave**

Em `stopGrouping.ts`, no fim:

```ts
/** Ponto do mapa (`/map-data`) — payload leve, sem `addressId`/`customerId`. */
export interface MapPointKeyInput {
    id: string
    latitude: number
    longitude: number
    title?: string | null
    serviceType?: string | null
}

/**
 * Chave de parada para os PONTOS DO MAPA.
 *
 * `/map-data` devolve um payload leve que não traz `addressId` nem `customerId`,
 * então aqui a porta é aproximada por coordenada arredondada (5 casas ≈ 1 m) +
 * título. É deliberadamente mais conservadora que `stopKeyOf`: sem título, não
 * agrupa. Errar para o lado de desenhar dois pinos é melhor que fundir duas
 * portas distintas no mapa.
 */
export function mapPointStopKeyOf(point: MapPointKeyInput): string {
    if (
        point.serviceType === ServiceType.RETURN ||
        point.serviceType === ServiceType.TRANSFER
    ) {
        return `solo:${point.id}`
    }

    const titulo = point.title ? normalizar(point.title) : ''
    if (!titulo) {
        return `solo:${point.id}`
    }

    return `geo:${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}|t:${titulo}|tipo:${point.serviceType ?? ''}`
}
```

Exportar `mapPointStopKeyOf` e `type MapPointKeyInput` no bloco novo de `_utils/index.ts`.

- [ ] **Step 4: Um pino por grupo em `useRouteMapView`**

Import novo:

```ts
import { groupContiguousBy, mapPointStopKeyOf } from '../../../../_utils/stopGrouping'
```

> Confirme a profundidade do caminho relativo com o `tsc`. O arquivo está em `[id]/parada/[pid]/_components/shared/`, então são quatro níveis até `[id]/`.

Substituir o `forEach` de `sortedServices` (linhas 129-138) por:

```ts
        // Um pino por PARADA, não por pedido: cinco notas na mesma porta viravam
        // cinco pinos empilhados com números diferentes. A numeração aqui passa a
        // bater com a da lista de paradas.
        groupContiguousBy(sortedServices, mapPointStopKeyOf).forEach((grupo, index) => {
            const representante = grupo[0]
            const sufixo = grupo.length > 1 ? ` (${grupo.length} notas)` : ''
            points.push({
                id: representante.id,
                latitude: representante.latitude,
                longitude: representante.longitude,
                title: `${representante.title || `Parada ${index + 1}`}${sufixo}`,
                label: index + 1,
                color: stopColorByStatus(representante.status),
            })
        })
```

> O traçado (`splitRouteAtLastStop`) usa a ÚLTIMA parada de `sortedServices` e não muda — o último pedido continua sendo o último ponto geográfico.

- [ ] **Step 5: Rodar, verificar e commitar**

Run: `npx jest --ci stopGrouping` → PASS
Run: `npx tsc --noEmit && npx jest --ci` → exit 0

Verificação manual: rota com 5 pedidos na mesma porta → 1 pino, rótulo com "(5 notas)", e o número do pino igual ao número do card na lista.

```bash
git add "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/stopGrouping.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/index.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/shared/useRouteMapView.ts" "src/app/(auth)/(tabs)/rotas-detalhadas/[id]/_utils/__tests__/stopGrouping.test.ts"
git commit -m "feat(mapa): um pino por parada, com contagem de notas

Cinco pedidos na mesma porta viravam cinco pinos empilhados com numeros
diferentes. A numeracao do mapa passa a bater com a da lista. O payload de
/map-data nao tem addressId/customerId, entao a chave do mapa usa coordenada
arredondada + titulo — deliberadamente mais conservadora: sem titulo, nao
agrupa."
```

---

### Task 9: Fechamento — verificação final e PR

- [ ] **Step 1: Verificação completa**

Run: `npx tsc --noEmit && npx jest --ci`
Expected: exit 0; 15 suítes (13 do baseline + `stopGrouping` + `paradaAgrupada`), nenhum teste vermelho, nenhum teste antigo removido.

- [ ] **Step 2: Conferir os critérios da spec §8, um a um**

| Critério | Onde está provado |
|---|---|
| 5 pedidos contíguos → 1 parada com 5 pedidos | `paradaAgrupada.test.ts` |
| 2 clientes no mesmo endereço → 2 paradas | `paradaAgrupada.test.ts` |
| não contíguos (rota legada) → 2 paradas | `stopGrouping.test.ts` + `paradaAgrupada.test.ts` |
| parada de 1 pedido idêntica ao atual | `paradaAgrupada.test.ts` + verificação manual (Task 5) |
| **"uma por vez" com irmãos** | `useStopStatus.test.tsx` + **mutação** (Task 2, Step 5) |
| 3 entregues + 2 insucesso → insucesso com "3 de 5" | `paradaAgrupada.test.ts` (status) + verificação manual (Task 6) |
| mapa: 5 pedidos na mesma porta → 1 pino | `stopGrouping.test.ts` + verificação manual (Task 8) |
| progresso "12 de 26 paradas" e "34 de 56 notas" | `paradaAgrupada.test.ts` |

- [ ] **Step 3: Abrir o PR contra `main`**

```bash
git push -u origin feat/parada-agrupada-app
```

> Se o `git push` falhar sem abrir prompt de credencial (Credential Manager), suba pelo GitHub MCP e avise que o SHA local diverge do remoto.

Corpo do PR: o problema (56 paradas onde são 26), a ordem das tasks e por que ela importa, as decisões §3 já fechadas com o dono do produto, o resultado das verificações manuais das Tasks 5, 6 e 8 (o que foi de fato executado — não afirme o que não rodou) e, explicitamente, o risco em aberto: **a contiguidade não é verificada em lugar nenhum do app**; em rota legada ou reordenada à mão a mesma porta vira duas paradas, o que é o comportamento seguro e agora está sinalizado na tela pelo aviso de endereço repetido.

---

## Fora de escopo (§9 da spec)

- Confirmação única para a porta inteira — exigiria refazer o `ParadaContext`, que ancora a sessão de evidência inteira num único `serviceId`.
- Agrupar por afinidade em vez de vizinhança.
- Retrofit de rotas legadas para tornar irmãos contíguos.
