# Task 10 — Roteamento nos quatro fluxos

## Status

Implementado nos quatro `index.tsx` + gating cosmetico em `TransferEtapaFinalizarColeta.tsx`.
Suite e tipos verificados, sem regressao.

## Arquivos alterados

- `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/entrega/index.tsx`
- `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/coleta/index.tsx`
- `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/service/index.tsx`
- `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/transfer/index.tsx`
- `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/parada/[pid]/_components/transfer/TransferEtapaFinalizarColeta.tsx`

## Caminho dos imports usados

O brief apontava `../_utils/completionRequirements`, que foi movido. Usados os
caminhos atuais:

```ts
import { requirementsForServiceType } from '@/domain/agility/company/completionRequirements';
import { resolveCompletionStep } from '../_utils/completionStep';
```

`resolveCompletionStep` NAO foi modificado.

## `readyAfterChecks` de cada fluxo (exatamente como no brief)

### entrega/index.tsx

```ts
const readyAfterChecks =
    delivered && !needsDeliveryCheck && !needsReturnCheck && (!hasFormGroups || formCompleted);
```

Origem: Step 1 do brief (linha 20-21). `needsDeliveryCheck` e `needsReturnCheck` ja existiam
no arquivo (checks de itens entregues e de retorno no mesmo stop).

### coleta/index.tsx

```ts
const readyAfterChecks = delivered && !needsMaterialCheck && (!hasFormGroups || formCompleted);
```

Origem: Step 2 do brief (linha 42). `needsMaterialCheck` ja existia (check dos materiais da coleta).

### service/index.tsx

```ts
const readyAfterChecks = delivered && (!hasFormGroups || formCompleted);
```

Origem: Step 3 do brief (linha 59). Sem check de itens no readyAfterChecks porque o check de
equipamento deste fluxo (`needsMaterialCheck`) e um PRE-STEP anterior a `isServiceStarted`,
fora do trecho de finalizacao — nao faz parte da expressao do brief e nao foi adicionado.

### transfer/index.tsx

```ts
const readyAfterChecks = delivered && !needsCheck;
```

Origem: Step 4 do brief (linha 78). `needsCheck` ja existia (check de itens em ambas as pernas,
carregamento/entrega). O ramo `final` preserva o `isPickup` que ja existia: `TransferEtapaFinalizarColeta`
para a perna de coleta, `SharedEtapaFinalizacao serviceType="entrega"` para a de entrega —
inalterado, so movido para dentro do `if (step === 'final')`.

## `requirements` de cada fluxo

- entrega → `requirementsForServiceType(completionRequirements, 'entrega')`
- coleta → `requirementsForServiceType(completionRequirements, 'coleta')`
- service → `requirementsForServiceType(completionRequirements, 'servico')`
- transfer → `requirementsForServiceType(completionRequirements, sharedType)` (`sharedType` ja
  existia: `isPickup ? 'coleta' : 'entrega'`)

`completionRequirements` foi adicionado a desestruturacao de `useParada()` em todos os quatro
arquivos (ja existia no contexto, Task 8).

## Gating cosmetico em `TransferEtapaFinalizarColeta.tsx`

As tres `Row` do checklist visual (Documento / Foto / Assinatura) ganharam o mesmo gating que
as telas irmas (`SharedEtapaFinalizacao`) ja tinham:

```tsx
{requirements.recipientIdentity !== 'HIDDEN' && <Row label="Documento de quem entregou" ... />}
{requirements.photos.mode !== 'HIDDEN' && <Row label="Foto da carga" ... />}
{requirements.signature !== 'HIDDEN' && <Row label="Assinatura coletada" ... />}
```

`requirements` ja existia no componente (`requirementsForServiceType(completionRequirements, 'coleta')`).
Nao mexe no botao "Concluir coleta" nem em `canCommit` — so oculta a linha visual quando o item
correspondente esta `HIDDEN` na config, igual as demais telas.

## Analise de "existe caminho para o fallback sem etapa assumir o lugar?"

Reli o diff completo (`git diff HEAD~1` apos o commit) pergunta a pergunta pedida para os quatro
fluxos. Em todos, o novo bloco so e alcancado depois que as ifs anteriores (loading, sucesso,
finalizado, etapas 1/2, check de itens, formulario dinamico) ja tiverem retornado — ou seja,
ao chegar no bloco novo, `delivered` ja e `true` (ou a etapa persistida ja e >= 3, mesmo
comportamento de risco que a versao anterior tinha com o `if (etapa === 5)` solto, que tambem
nao checava `delivered`). Dentro do bloco, `resolveCompletionStep` so devolve `null` quando
`!readyAfterChecks && etapa < 3` — e essa combinacao nunca chega ao bloco porque as ifs
anteriores ja capturam todo estado com `etapa < 3` e `!delivered`. Quando `step` e `null`,
cai no fallback de etapa inicial do proprio fluxo (`EtapaInicial` / `ColetaEtapaInicial` /
`ServiceEtapaInicial` / `TransferEtapaInicial`) — que e o comportamento esperado (nao e o caso
perigoso; e so a tela seguindo suas proprias etapas).

Nao encontrei combinacao de config (`HIDDEN`/`OPTIONAL`/`REQUIRED`) e estado (`delivered`,
`recipient.tipo`, `etapa`) em que, apos os checks proprios do fluxo, nenhum dos tres `if (step
=== ...)` case e nenhuma if anterior no arquivo, resultando no fallback com o motorista preso.
`resolveCompletionStep` sempre devolve `'recipient'`, `'data'` ou `'final'` quando
`readyAfterChecks` e `true` (ou `etapa >= 3`), nunca `null` nesses casos — conferido tambem
pela suite de testes de `completionStep.test.ts`, que cobre exatamente os casos de config
oculta em cascata.

## Nao contornei nada

`resolveCompletionStep` cobriu todos os casos reais dos quatro fluxos sem precisar de excecao
nos `index.tsx`. Nao houve necessidade de parar e reportar um caso descoberto.

## Verificacao

- `npx tsc --noEmit`: mesmos 2 erros pre-existentes em
  `src/app/(auth)/(tabs)/menu/suporte/[id].tsx` (linhas 565 e 573, `Timeout` -> `number`).
  Nenhum erro novo.
- `npx jest --watchAll=false`: **34 suites, 350 testes, 0 falhas** (identico a baseline).

## Nao executado

Step 6 do brief (conferir no app rodando) foi deliberadamente pulado, conforme instrucao.

---

# Correcao pos-revisao (mesmo dia)

A revisao (enumeracao exaustiva) confirmou que nenhuma combinacao de config prende o motorista
no fallback — o `null` de `resolveCompletionStep` so acontece numa linha que nem le
`requirements`, e os quatro fluxos ja cobrem esse caso antes de chegar no bloco novo. Apareceram
5 pontos; os 5 foram endereçados.

## 1. (Important) Botao de VOLTAR nao era config-aware — `delivered` ficava preso em `true`

**Sintoma:** `SharedEtapaDados.handleBack` fazia `setEtapa(3)` fixo, contando que a etapa 3 fosse
sempre o Recebedor. Com `recipientType: HIDDEN`, essa etapa nao existe mais no caminho — voltar
devolvia para uma tela que `resolveCompletionStep` roteava de volta para o mesmo lugar (loop). O
mesmo valia para `SharedEtapaFinalizacao` (`setEtapa(4)` fixo) e para `TransferEtapaFinalizarColeta`
(idem). Só `SharedEtapaRecebedor` fazia `setDelivered(false)` — as outras nunca resetavam, entao
mesmo saindo e reentrando (o rascunho restaura `etapa`, nao `delivered`) o motorista continuava
sem caminho de volta ao ponto de decisao.

**Fix — extraida como funcao irma em `completionStep.ts`, nao espalhada em `if`s por tela:**

```ts
export interface PreviousStepInput {
    from: 'data' | 'final'
    requirements: FlowCompletionRequirements
}

export interface PreviousStepResult {
    etapa: number
    resetDelivered: boolean
}

export function resolvePreviousStep({ from, requirements }: PreviousStepInput): PreviousStepResult {
    const showRecipient = requirements.recipientType !== 'HIDDEN'
    const showData = hasDataStep(requirements)

    if (from === 'final' && showData) return { etapa: 4, resetDelivered: false }
    if ((from === 'final' || from === 'data') && showRecipient) return { etapa: 3, resetDelivered: false }

    return { etapa: 2, resetDelivered: true }
}
```

Optei pela extracao (em vez do jeito mais simples com `if`s inline) porque e o mesmo raciocinio
de `resolveCompletionStep` espelhado — deixar duas copias divergirem de novo é exatamente o que
este epico inteiro esta desfazendo, e agora ha um so lugar testado para os dois sentidos
(ida/volta).

**Onde foi ligada:**
- `SharedEtapaDados.handleBack`: `resolvePreviousStep({ from: 'data', requirements })`.
- `SharedEtapaFinalizacao.handleBack` e `TransferEtapaFinalizarColeta.handleBack`:
  `resolvePreviousStep({ from: 'final', requirements })`.

Todas as tres agora fazem `setEtapa(etapa)` e, quando `resetDelivered` e `true`, tambem
`setDelivered(false)` — `setDelivered` foi adicionado a desestruturacao de `useParada()` nas tres.

## 2. (Important) `recipientType: 'OPTIONAL'` se comportava como `'REQUIRED'`

**Mudanca de semantica em `completionStep.ts` (arquivo que o brief original tinha me proibido de
tocar; a revisao liberou para este caso especifico):**

Antes:
```ts
if (showRecipient && !hasRecipientType) return 'recipient'
```
Isso forcava a tela do recebedor sempre que o tipo nao estivesse escolhido, **sem distinguir**
`REQUIRED` de `OPTIONAL` — os dois modos se comportavam identicos (so `HIDDEN` era diferente).

Depois:
```ts
if (showRecipient && !hasRecipientType) {
    if (requirements.recipientType === 'REQUIRED') return 'recipient'
    if (requirements.recipientType === 'OPTIONAL' && etapa < 4) return 'recipient'
}
if (showRecipient && etapa === 3) return 'recipient'
```
`REQUIRED` continua identico a antes (forca em qualquer etapa). `OPTIONAL` agora só mostra o
recebedor enquanto o motorista ainda nao passou por ele (`etapa < 4` — a etapa que so existe
depois de sair do recebedor); passado esse ponto, o roteador segue para `data`/`final` mesmo sem
tipo escolhido. A regra "etapa 3 e sempre a porta do recebedor" (para reabrir e trocar a escolha)
ficou intacta para os dois modos.

`SharedEtapaRecebedor.tsx` ganhou o `requirements` do proprio fluxo e:
- `disabled={requirements.recipientType === 'REQUIRED' && !recipient.tipo}` no botao "Próximo"
  (antes: `disabled={!recipient.tipo}`, que bloqueava OPTIONAL tambem);
- um aviso `"Opcional — você pode seguir sem selecionar."` quando `isOptional`.

**Testes:** todos os testes antigos de `completionStep.test.ts` continuam passando sem alteracao
(usam `DEFAULT_FLOW_REQUIREMENTS`, que e `REQUIRED` — o caminho `OPTIONAL` e aditivo, nao mexe no
existente). Adicionado `describe('resolveCompletionStep — recebedor OPTIONAL nao pode virar
REQUIRED')` com 4 casos novos (etapa < 4 sem tipo -> recipient; etapa 4 sem tipo -> data; com tipo
-> data; etapa 3 -> recipient mesmo em OPTIONAL).

## 3. (Minor) `TransferEtapaFinalizarColeta`: linha "Documento" nunca ficava verde

Nenhum lugar do repositorio chama `updateChecklist('documento', true)` (só `false`, no `onClear`).
`safe.documento` derivava de `checklist?.documento`, cujo unico "true" possivel vinha de um efeito
global em `ParadaContext` — indireto o bastante para nao ser obvio lendo so este arquivo. Troquei
para derivar direto do dado real, como pedido:

```ts
const documentoPreenchido = !!recipient?.nome?.trim() && !!recipient?.numeroDocumento?.trim();
const safe = { documento: documentoPreenchido, foto: ..., signature: ... };
```

Como o `onClear` antigo (`updateChecklist('documento', false)`) parou de ter efeito sobre esse
`ok` (que agora nao le mais o checklist), troquei o `onClear` para limpar o dado real:
`updateRecipient({ nome: '', tipoDocumento: 'RG', numeroDocumento: '' })` — mantem o botao "X"
funcional, em vez de virar um no-op silencioso.

## 4. (Minor) `readyAfterChecks` extraido por fluxo, com teste — foco no `transfer`

Novo arquivo `_utils/readyAfterChecks.ts` com uma funcao pura por fluxo
(`entregaReadyAfterChecks`, `coletaReadyAfterChecks`, `servicoReadyAfterChecks`,
`transferReadyAfterChecks`), cada uma recebendo os flags do proprio fluxo e devolvendo o boolean —
mesma expressao de antes, so nomeada e testavel.

O `transfer` e tratado diferente dos outros tres: `transferReadyAfterChecks` devolve
`{ readyAfterChecks, sharedType }` como um par, com `sharedType` derivado de `isPickup` **dentro**
da mesma funcao, em vez de `transfer/index.tsx` computar `sharedType` numa linha solta como fazia
antes (`const sharedType = isPickup ? 'coleta' : 'entrega'`). Isso ataca exatamente o risco
apontado: antes, inverter `isPickup` ou fixar `sharedType` num valor constante no `index.tsx` nao
quebrava tsc nem suite (os dois sao `'coleta' | 'entrega'` validos dos dois jeitos) — a perna de
coleta passaria a ler os requisitos de entrega em silencio. Agora o par nasce junto, testado junto
(`readyAfterChecks.test.ts` tem dois testes dedicados: `isPickup: true` -> `sharedType: 'coleta'`,
`isPickup: false` -> `sharedType: 'entrega'`), e `transfer/index.tsx` so consome o resultado —
nao ha mais um segundo lugar onde a relacao possa se perder.

Teste: `_utils/__tests__/readyAfterChecks.test.ts`, cobrindo as quatro expressoes (casos
true/false para cada flag relevante) e o par `sharedType`/`isPickup` do transfer.

## 5. Testes das duas combinacoes que a integracao produz

Adicionados a `completionStep.test.ts`, `describe('resolveCompletionStep — combinacoes que a
integracao produz de verdade')`:

- **`etapa 2 + readyAfterChecks true + hasRecipientType true` → `data`** (antes do Task 10,
  nenhum dos tres `if` fixos de cada `index.tsx` batia nessa combinacao — nem `etapa===4`, nem
  `etapa===3 || (delivered && !recipient.tipo && ...)` — e a tela caia no fallback `EtapaInicial`;
  o roteador reconhece a combinacao direto, sem depender do valor numerico de `etapa`).
- **`etapa 3 restaurada sem delivered` → `recipient`** e **`etapa 4 restaurada sem delivered, com
  tipo ja salvo` → `data`**: o caso do rascunho restaurado (`ParadaContext` reidrata `etapa` do
  draft, mas `delivered` volta a `useState(false)` no remount). Documentado como **risco
  preexistente, nao introduzido por esta correcao** — o `if (etapa === 5)` avulso que ja existia
  antes do Task 10 tambem nao checava `delivered`; o gate `!readyAfterChecks && etapa < 3` de
  `resolveCompletionStep` so vale para `etapa < 3`, entao etapas >= 3 sempre seguiram pela etapa
  persistida. Os testes existem para que uma mudanca futura nao reintroduza isso pensando que e
  caminho morto.

Tambem adicionado `describe('resolvePreviousStep — a volta espelha a ida')` com os 5 casos da
funcao nova (recebedor visivel/oculto a partir de `data`; dados/recebedor/tudo oculto a partir de
`final`).

## Mudanca de semantica em `completionStep.ts` (resumo direto)

1. `resolveCompletionStep`: `OPTIONAL` deixou de se comportar como `REQUIRED`. Antes forcava
   `'recipient'` sempre que `!hasRecipientType`, independente do modo. Agora só forca para
   `REQUIRED` (em qualquer etapa) e para `OPTIONAL` apenas com `etapa < 4` (antes do motorista
   "passar" pela etapa); com `etapa >= 4` e `OPTIONAL`, segue para `data`/`final` sem exigir a
   escolha. A regra da "porta" (`etapa === 3` -> `'recipient'`) nao mudou.
2. `resolvePreviousStep`: funcao **nova** (nao existia antes), sibling de `resolveCompletionStep`,
   sem mudar nada do comportamento existente da funcao original.

## Verificacao (pos-correcao)

- `npx tsc --noEmit`: mesmos 2 erros pre-existentes em `suporte/[id].tsx` (565, 573). Nenhum novo.
- `npx jest --watchAll=false`: **35 suites, 382 testes, 0 falhas** (era 34/350; +1 suite nova —
  `readyAfterChecks.test.ts` — e +32 testes entre ela e os casos novos de `completionStep.test.ts`).
