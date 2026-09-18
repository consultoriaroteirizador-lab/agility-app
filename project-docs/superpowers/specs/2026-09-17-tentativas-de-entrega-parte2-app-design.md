# Tentativas de entrega — Parte 2 (app do motorista)

**Data:** 17/09/2026
**Repositórios:** `lab-app` (o grosso) e `agility-services` (dois retoques)
**Épico:** `agility-services#641` — `project-docs/superpowers/specs/2026-09-16-tentativas-de-entrega-design.md`
**Parte 1 (backend):** `agility-services#659`, mergeada e validada no dev em 17/09/2026
(relatório: `Downloads/validacao-dev-tentativas-parte1-2026-09-17.md`)

## 1. Por que esta parte existe

A Parte 1 mudou o significado de uma entrega falhada: o pedido passa a ficar **FAILED
dentro da rota**, com uma linha `AWAITING_RETURN` em `service_delivery_attempts`, até
alguém confirmar que a mercadoria voltou ao CD. Só o fechamento dessa tentativa decide
se o pedido volta à fila (`REQUEUED`) ou morre ali (`FAILED_FINAL`).

Hoje, no ar, **existe uma única via de fechamento**: a confirmação do operador
(`POST /services/:id/return-confirmation`). A via desenhada para ser a normal — o
motorista conferindo a devolução na parada de retorno, `returnSource = RETURN_STOP` —
nunca dispara, porque o app não manda ao backend os pedidos que ele mesmo exibe como
devolvidos. Enquanto isso não muda, toda falha vira trabalho manual da central e o
pedido fica preso na rota (cinco gestos respondem 409 até a devolução ser confirmada).

> **CORREÇÃO (18/09/2026, medida no teste de campo).** O parágrafo acima está **errado na
> consequência**, e a §4 (F2) explica por quê. O `RETURN_STOP` **já disparava** pelos itens
> do manifesto: `getReturnManifest` inclui todo serviço da rota que não é a parada de
> retorno e, desde 14/07 (`3242e709`), emite uma linha "pedido inteiro"
> (`quantity = amountItems`) para o serviço `FAILED` que não gerou material. Como o
> checklist do manifesto sempre foi enviado com `serviceId`, o fechamento pelo motorista
> funcionava para pedido falhado em rota comum. O que a F2 conserta é a lista paralela de
> cartões do app, que de fato não era enviada — mas que quase nunca é renderizada, porque
> o pedido já está no manifesto. **A F2 é uma guarda, não o destravamento do fluxo.**
> A causa do erro: escrevi a spec lendo o app e o consumidor no backend, sem ler a origem
> da lista (`getReturnManifest`).

Esta spec cobre o app e os dois retoques de backend que ele encosta.

## 2. O que o backend já aceita (medido em `origin/development`, 17/09/2026)

Nada aqui precisa ser construído — o app só não usa:

| Contrato | Estado |
|---|---|
| `ApplyOccurrenceDto` | aceita `latitude`, `longitude`, `accuracy`; **latitude sem longitude = 400**, faixa validada, string recusada, `accuracy >= 0` (`src/service/dto/apply-occurrence.dto.spec.ts`) |
| `ServiceCompletionDetailsDto.returnFacilityId` | existe, `@IsUUID()` `@IsOptional()` (`service-completion-details.dto.ts:239`) |
| `receivedBy` | já existia no mesmo DTO; vira `received_by` da tentativa |
| Fechamento por parada de retorno | `closeReturnedAttempts` → `resolveReturnedAttempts` com `returnSource: 'RETURN_STOP'` (`service.service.ts:1760`) |
| Quem conta como devolvido | `returnedServiceIds`/`isReturnedChecklistItem` (`delivery-attempt.rules.ts:44`): `checked === true` e (`received > 0` **ou** `quantity <= 0`). Item de quantidade zero conferido **conta** |
| `GET /services/:id/attempts` | `@Roles('COLLABORATOR', 'BRANCH_ADMIN', 'BRANCH_OPERATOR')` — o motorista tem `COLLABORATOR` |
| `ReturnChecklistItemDto.material` | **`@IsNotEmpty()`** — item sem material não passa pelo `ValidationPipe` |

Erro de fechamento é logado e **não** desfaz a conclusão da parada (`service.service.ts:1782`):
o motorista nunca fica preso por causa da tentativa, e o que falhar cai para o operador.

## 3. Decisões

| # | Decisão |
|---|---|
| D1 | O motorista vê o histórico completo das tentativas anteriores — data, motivo, observação, fotos e desfecho — **sem o nome de quem tentou**. |
| D2 | Na tela de retorno o motorista escolhe o **CD da devolução** (seletor, pré-selecionado no CD de retorno da rota) e digita **quem recebeu** (texto livre). Os dois são **opcionais**. |
| D3 | O GPS da ocorrência é **best-effort**: nunca bloqueia, nunca exibe erro. Mesmo contrato do `getCurrentCoords()` que a conclusão de parada já usa. |
| D4 | A Parte 2 leva junto dois retoques de backend: `maxAttempts` no DTO de leitura e o fechamento do furo do `PUT /status`/`PATCH`. |
| D5 | Foto na devolução continua **opcional** (decisão do épico; o backend não aplica `validateProof` na devolução). |

**Sobre D1:** `DeliveryAttemptJson` devolve `driverName` e `failedBy.name`
(`delivery-attempt.mapper.ts:56` e `:58`). Esconder o colega é decisão de **renderização do
app** — a resposta continua trazendo o nome. Se o produto quiser garantia de que o
motorista não alcança esse dado, é projeção nova no backend; fica em §9.

## 4. O que muda no app

### F2 — o checklist de retorno leva todo pedido falhado (primeira a entregar)

**Defeito:** em `retorno/index.tsx:257` o `returnChecklist` é montado **só** a partir de
`items` (manifesto). Os cartões de `pedidosVolta` (linha 213: pedidos `FAILED` da rota
sem linha de manifesto) são exibidos, entram no gate `allConferred` (linha 232) e
**nunca são enviados**. Resultado: o motorista confere, o botão libera, e a tentativa
desses pedidos segue `AWAITING_RETURN` esperando a central.

> **CORREÇÃO (18/09/2026, teste de campo na rota `U4LDZAB`).** O defeito acima é real, mas o
> alcance é muito menor do que esta spec afirmou. `getReturnManifest` consulta
> `{ routingId, companyId, serviceType: { not: 'RETURN' } }` — **todo** serviço da rota — e
> tem fallback desde 14/07 (`3242e709`): serviço `FAILED` que não gerou linha de material
> entra como "pedido inteiro", com `quantity = amountItems`. Na tela do motorista, os dois
> pedidos falhados do teste (`SEED-260716-0316` e `0326`, **zero** linhas em
> `service_materials`) apareceram como itens de manifesto `16/16` e `8/8`. Ou seja:
> `jaNoManifesto` é verdadeiro para pedido falhado em rota comum, `pedidosVolta` fica vazio,
> e o checklist já levava esses pedidos com `serviceId`. **A F2 continua correta** — sem ela
> um cartão renderizado seria silenciosamente descartado —, mas ela é uma guarda para o caso
> em que o manifesto não cobre (malha, ou mudança futura na consulta), não o conserto do
> caminho principal. A ordem de entrega da §7, que a colocou em primeiro por ser "o buraco
> funcional", foi decidida com essa premissa errada.

**Mudança:** extrair a montagem para uma função pura
`_utils/returnChecklist.ts` → `montarReturnChecklist({ items, conferred, receivedQty, pedidosVolta, pedidoConferred })`
que devolve os itens do manifesto **mais** uma linha por pedido de `pedidosVolta`:

```ts
{
  material: p.code ?? 'Pedido devolvido',   // ReturnChecklistItemDto.material é @IsNotEmpty
  serviceId: p.id,
  serviceCode: p.code ?? null,
  quantity: 0,
  received: 0,
  origin: 'UNDELIVERED',
  reason: 'FAILED',
  checked: !!pedidoConferred[p.id],
}
```

`quantity: 0` + `received: 0` + `checked: true` satisfaz `isReturnedChecklistItem`
(o ramo `!(quantity > 0)`), que é exatamente o caso que a regra do backend já prevê
para "pedido inteiro sem itens". Deduplicar por `serviceId`: um pedido que apareça no
manifesto **e** na lista de cartões manda uma linha só (o backend já deduplica, mas a
lista é o que fica salvo em `services.return_checklist` e lido pela web).

### F3 — CD da devolução e quem recebeu

Na tela de retorno, antes do botão "Concluir retorno":

- **Seletor de CD** — `useFindAllDistributionCenters({ activeOnly: true })`, hook que já
  existe e já é usado em `_components/TransferOverviewStep.tsx:26`. Valor inicial:
  `routing.returnFacilityId`. Sem CD cadastrado na rota, abre sem seleção.
- **"Quem recebeu no CD"** — `Input` de texto, sem máscara, sem documento.

Ambos entram no `completeWithDetails`: `returnFacilityId` (UUID) e `receivedBy`.
Nenhum dos dois trava o botão (D2). Sem CD, o backend fecha a tentativa sem gravar
custódia; sem recebedor, ele usa o nome do motorista e anota isso no comprovante.

**Dependência de tipo:** `routing.response.ts` do app não declara `returnFacilityId`
(só `destinationFacilityId`, linha 191). O `toJson` da rota no backend já devolve o
campo (`routing.entity.ts:1014`) — o plano confirma que o payload consumido pelo app
passa por esse `toJson` e acrescenta o campo ao DTO do app.

### F5 — histórico de tentativas na parada

Domínio novo no app: `domain/agility/service/` ganha `findAttempts(id)` →
`GET /services/:id/attempts`, com `useFindServiceAttempts`.

Onde aparece:

1. **Selo na parada** (`parada/[pid]/index.tsx`): "2ª tentativa de 3" quando
   `attemptCount > 0`. O "de 3" depende de **B1**; sem ele o selo mostra só a ordem.
2. **Detalhe expansível**, uma linha por tentativa anterior: data/hora, motivo
   (`reasonName`), observação (`notes`), fotos (`photoProof`) e desfecho
   (`outcome` + `returnedFacilityName` quando houver). **Não renderiza**
   `driverName` nem `failedBy.name` (D1).

Rótulos: `AWAITING_RETURN` → "Aguardando devolução ao CD"; `REQUEUED` → "Voltou para a
fila"; `FAILED_FINAL` → "Insucesso definitivo". Mapa exaustivo com fallback, no mesmo
padrão de `insucesso/occurrenceOutcome.ts` e `_utils/routeNonDelivered.ts:outcomeLabel`.

Cache: `staleTime` curto e invalidação junto de `routeStopChangedKeys` — a tentativa
nasce no mesmo gesto que já invalida a parada.

### F1 — GPS na ocorrência

`ApplyOccurrenceRequest` (`dto/request/apply-occurrence.request.ts`) ganha
`latitude?`, `longitude?`, `accuracy?`. A tela de insucesso chama `getCurrentCoords()`
antes do `registerOccurrence`, como `retorno/index.tsx:276` já faz na conclusão.

Regra do payload, em função pura testável: **só envia o par completo**. Sem coordenada,
ou com uma das duas ausente/não-finita, envia nada — `ApplyOccurrenceDto` responde 400
para latitude sem longitude. `accuracy` só entra se for número finito e `>= 0`.
`serviceAPI.applyOccurrence` já remove `undefined`/`null` do corpo, mas a decisão não
pode depender disso: `latitude: 0` é coordenada legítima e não pode ser podada por
falsy.

Nada muda no fluxo: GPS negado, desligado ou lento (timeout de 5 s no `getCurrentCoords`)
segue para o registro da nota sem localização.

### F4 — "Cheguei no retorno" e a fase de custódia

`isHandedOff(phase)` (`retorno/index.tsx:54`) conta `AT_HUB`/`OUT_FOR_DELIVERY`/
`DELIVERED` como "encerrado para o trecho", **sem olhar o tipo da perna** — item O5 do
épico. Com a Parte 1, um pedido devolvido em rota comum passa a ficar `AT_HUB` com
`current_facility_id`, então a fase deixa de ser inerte fora da malha.

**Mudança:** `isHandedOff(phase, legType)` — `AT_HUB` só conta como encerrado quando
`legType === 'TRANSFER'`. `legType` já está tipado em `routing.response.ts:174`.
`OUT_FOR_DELIVERY`/`DELIVERED` seguem como hoje (nunca são gravados em rota comum).

## 5. O que muda no backend

### B1 — `maxAttempts` no `DeliveryAttemptJson`

O valor é congelado na falha e gravado na tabela (`delivery-attempt.mapper.ts:39`), mas
não sai pela API: `DeliveryAttemptJson` não o declara, e `GET /attempts` devolve
`undefined` (medido no dev). Acrescentar o campo à interface e ao `toAttemptJson`, com
teste. É o que permite "2 de 3" em vez de "2ª tentativa" — no app (F5) e depois na web.

### B2 — `PUT /services/:id/status` e `PATCH /services/:id` param de criar FAILED

`ServiceEntity.VALID_TRANSITIONS` aceita `PENDING|ASSIGNED|IN_PROGRESS|IN_ATTENDANCE →
FAILED`, e `changeStatus` (`service.service.ts:2401`) grava por `updateStatusDirect`
**sem** `registerFailedAttemptDirect`. `assertCanLeaveFailed` não cobre: ele retorna
cedo quando o destino é `FAILED`. O `update` (PATCH, linha ~836) faz o mesmo.

Resultado: pedido FAILED **sem linha de tentativa** — `attemptCount` parado, nenhum
`AWAITING_RETURN`, os cinco 409 não disparam e a rota pode ser movida ou excluída com a
mercadoria ainda no caminhão. É a única porta que fura o modelo da Parte 1.

**Mudança:** os dois caminhos recusam `status: FAILED` com 400 apontando o caminho certo
(`POST /services/:id/occurrence` para o motorista, `POST /services/:id/fail` para o
legado). `@Roles` do `PUT` inclui `SHIPPER_ADMIN`/`SHIPPER_OPERATOR`, que já só podem
cancelar — a recusa vale para todos.

**Verificar no plano:** nenhuma tela chama hoje (no front o hook
`useChangeServiceStatus` está exportado sem consumidor; no app existe o wrapper
`serviceAPI.changeStatus` sem tela). Confirmar também importação/integrações antes de
fechar.

## 6. Testes

Funções puras em `_utils`, com jest, no padrão dos `__tests__` que já existem nessas
pastas:

| Teste | Afirma |
|---|---|
| `montarReturnChecklist` | pedido de `pedidosVolta` conferido **entra** com `quantity: 0`/`received: 0`/`material` não vazio; não conferido entra com `checked: false`; pedido que está nos dois lugares aparece **uma vez**; manifesto puro não muda de forma |
| payload da ocorrência | par completo passa; só latitude → nada; `latitude: 0` **não** é podado; `accuracy` inválida sai sozinha |
| `isHandedOff(phase, legType)` | `AT_HUB` + `TRANSFER` = encerrado; `AT_HUB` + `LAST_MILE`/`null` = **não**; `DELIVERED` segue encerrado nos dois |
| rótulos de `outcome` | mapa exaustivo dos três valores + fallback |

Backend: teste do `toAttemptJson` com `maxAttempts` e teste de que `changeStatus`/`update`
recusam `FAILED` (e continuam aceitando os demais destinos).

Fim a fim, no dev: repetir o roteiro da validação da Parte 1 pelo app — ocorrência
`RETURN_TO_POOL` com GPS → pedido FAILED na rota → conferir na parada de retorno com CD
e recebedor → a tentativa fecha em `REQUEUED` com `return_source = RETURN_STOP`,
`returned_facility_id` preenchido e `CustodyHandoff` gravado. É o caminho que a
validação de 17/09 **não** exercitou.

## 7. Ordem de entrega

1. **F2** — fecha o buraco funcional; sozinha já destrava o `RETURN_STOP`.
2. **B1 + F5** — o backend primeiro, senão o selo nasce sem o "de 3".
3. **F3** — CD e recebedor (depende do campo novo no DTO de rota do app).
4. **F1** — GPS na ocorrência.
5. **F4** — gate do "Cheguei no retorno".
6. **B2** — independente das demais; pode ir a qualquer momento.

F2 e F3 tocam o mesmo arquivo (`retorno/index.tsx`) e a mesma chamada de conclusão:
entregar em PRs empilhadas ou aceitar o conflito de merge — não paralelizar.

## 8. Riscos

- **App antigo em campo.** Todos os campos novos são opcionais no backend; uma versão
  velha continua concluindo o retorno sem CD, sem recebedor e sem os cartões extras — o
  que sobra vai para o operador, como já vai hoje. Nenhuma mudança é quebra de contrato.
- **Ordem de deploy.** Nada no app exige backend novo além de **B1** (que só muda a
  presença de um campo opcional na leitura). O app pode subir antes.
- **Falha silenciosa do fechamento.** `closeReturnedAttempts` engole o erro e loga. Se a
  devolução não fechar, o motorista não fica sabendo — por desenho. A tela de "aguardando
  devolução" da Parte 3 é quem expõe isso ao operador.
- **`current_facility_id` em rota comum.** F4 muda uma trava de tela com base numa fase
  que a Parte 1 passou a gravar fora da malha. Conferir no dev com uma rota comum que
  teve devolução antes de dar como pronto.

## 9. Fora desta spec

- Esconder `driverName` da resposta de `GET /attempts` (projeção nova no backend).
  Hoje o dado chega ao app e é o app que não o mostra (D1).
- Fechar tentativa por parada de retorno **de perna de malha** — a devolução de
  transferência continua pelo fluxo de handoff.
- Parte 3 (web) e Parte 4 (relatório e `shipper_isolation` antes de expor ao embarcador).
- As três decisões de produto abertas do épico: motorista lendo tentativas de outros
  motoristas (D1 resolve só a exibição), `returnSource` do cancelamento de rota, e
  pedido atribuído direto (sem rota) fechando na hora.

## 10. Achados do teste de campo (18/09/2026, rota `U4LDZAB`)

1. **O alcance da F2 era menor do que a spec dizia** — ver as duas correções acima.
2. **O seletor de CD não escala.** Com os 10 CDs da empresa de teste, os chips viram um
   paredão que empurra "Quem recebeu no CD" para fora da dobra. Com essa quantidade o
   controle certo é uma busca, não chips; e o CD pré-selecionado deveria aparecer primeiro,
   não no fim da lista. Ajuste de UI pendente, não bloqueante.
3. **O GPS da ocorrência não chegou** nas duas tentativas registradas pelo app
   (`latitude`/`longitude` nulos), enquanto as duas de 17/09, enviadas por API, têm
   coordenada. Três causas possíveis, ainda não separadas: permissão negada, timeout de 5s
   do `getCurrentCoords` (típico de emulador sem posição) ou bundle antigo servido por um
   Metro que não reiniciou depois do pull. O log em `__DEV__` do `getCurrentCoords`
   distingue as três.
4. **O `CANCEL_ORDER` não devolve a mercadoria** — achado que virou adendo próprio
   (`agility-services#678`).
