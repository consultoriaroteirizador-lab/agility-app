# Parada Agrupada no App — Camada 2

**Data:** 2026-07-30
**Escopo:** `lab-app` (app do motorista). Nenhuma mudança de backend.
**Depende de:** Camada 1 (`agility-services` PR #427, mergeada) — é ela que garante a contiguidade que este trabalho assume.

---

## 1. O problema

`Service` acumula dois papéis no modelo: ele é o **pedido** e é a **parada**. O app herdou isso — `mapServicesToParadas` é `services.map(...)`, 1:1 (`_utils/routeCalculations.ts:82-85`).

Com os dados reais do cliente que originou o épico, o motorista veria **56 paradas onde são 26**. O SAO LUIZ CRATO apareceria **5 vezes seguidas**, cada uma com check-in, foto e canhoto próprios — no mesmo balcão.

E não é só a lista: `useRouteMapView.ts:94-103` cria **um pino por serviço**, numerado `index+1`. Cinco pedidos na mesma porta viram cinco pinos empilhados com números diferentes.

A planilha do cliente já opera com a distinção — ela tem `Quantidade de entregas` (25) e `Quantidade Total de Notas` (54) como colunas separadas. Nós tratamos como se fossem a mesma coisa.

---

## 2. A invariante

> O agrupamento é de **LEITURA**. Nenhum modelo muda, nenhum endpoint muda, e cada pedido continua sendo um `Service` próprio com seu `sequenceOrder`, seu status e sua evidência.

A Camada 1 garante que os pedidos de uma mesma parada saem com **`sequenceOrder` contíguo**. É isso que permite agrupar por vizinhança em vez de por afinidade — e agrupar por vizinhança é o que preserva o itinerário que o otimizador decidiu.

**`Parada` cresce de forma ADITIVA:** mantém `serviceId` (que passa a ser o do pedido **representante**, o primeiro do grupo) e ganha `pedidos: ServiceResponse[]`. Assim a maioria dos ~68 arquivos que hoje leem `Parada` continua funcionando sem alteração — só mudam os que precisam listar os N.

---

## 3. Decisões fechadas com o dono do produto

### 3.1 O motorista confirma **nota por nota**

Cada nota tem canhoto próprio na operação do cliente. Então a tela da parada vira um **índice**: lista os N pedidos, e cada um abre o fluxo de entrega que **já existe, intocado** — foto, assinatura, checklist, código, insucesso.

Isso é o que mantém o trabalho numa camada fina. A alternativa (uma confirmação para a porta inteira) exigiria refazer o `ParadaContext`, que hoje ancora a sessão de evidência inteira num único `serviceId` (`_context/ParadaContext.tsx:236-238`).

**Parada de UM pedido segue direto para o fluxo atual**, sem tela intermediária — comportamento idêntico ao de hoje, que é a situação da maioria das empresas.

### 3.2 Status da parada: pendente enquanto houver pendente

`Parada.status` é escalar e passa a ser derivado dos N:

| Situação dos pedidos | Status da parada |
|---|---|
| algum em atendimento | `em-atendimento` |
| algum em andamento | `em-andamento` |
| algum pendente (e nenhum acima) | `pendente` |
| todos terminais | concluída (ver 3.3) |

Uma parada só fecha quando **todos** os seus pedidos fecham.

### 3.3 Grupo misto aparece em "insucesso", com contagem

A tela tem duas seções — *concluídas com sucesso* e *com insucesso* (`[id]/index.tsx:207-220`) — e hoje uma parada cai inteira numa ou noutra. Grupo misto (3 entregues, 2 recusados) **não tem representação**.

Decisão: parada com qualquer insucesso vai para a seção de **insucesso**, exibindo `3 de 5 entregues`. É o recorte que não esconde o problema do operador.

### 3.4 Janela de tempo: a mais restritiva na parada, a de cada nota no card

Cada pedido pode ter `promisedStartDate`/`promisedEndDate` diferentes. A parada exibe a **mais restritiva** (o compromisso mais apertado); o card de cada nota mostra a dela. Colapsar sem mostrar perderia granularidade que o motorista usa.

---

## 4. O bloqueador — sem isto, o motorista trava

`useStopStatus` (`parada/[pid]/_hooks/useStopStatus.ts:50-119`) decide "uma parada por vez" comparando **`service.id` individual**:

```ts
allServices.some(s => s.id !== currentServiceId && (s.isInProgress || s.isInAttendance || ...))
```

Com agrupamento, o motorista inicia a nota 1 e as notas 2–5 **da mesma porta** passam a contar como "outro serviço em andamento" — e a regra o **impede de continuar**. A feature fica inutilizável com `enforceSingleActiveStop` ligado.

**Correção obrigatória:** irmãos da mesma parada não conflitam entre si. O predicado passa a excluir os pedidos que compartilham a parada do serviço corrente, não só o próprio id.

O mesmo vale para `enforceStopOrder` (`nextExpected`, `:66-79`): a "próxima esperada" é a próxima **parada**, e qualquer pedido dela é válido para iniciar.

---

## 5. Superfície

| Arquivo | Mudança |
|---|---|
| `_utils/routeCalculations.ts:56-85` | `mapServicesToParadas` agrupa vizinhos contíguos por `(addressId, cliente)`; `getParadasOrdenadas` continua ordenando por `sequenceOrder` |
| `_types/rota.types.ts:74-136` | `Parada` ganha `pedidos: ServiceResponse[]`; `serviceId` vira o do representante (documentar) |
| `_utils/statusMappers.ts:81-229` | `getParadaStatus` agrega os N (§3.2); `mapServiceToParada` vira `mapGrupoToParada` |
| `parada/[pid]/index.tsx:123-176` | com N>1, renderiza o índice; com N==1, o redirecionamento atual, inalterado |
| `parada/[pid]/_hooks/useStopStatus.ts:50-119` | irmãos não conflitam (§4) |
| `_components/shared/useRouteMapView.ts:94-103` | um pino por parada, com contagem quando N>1 |
| `[id]/index.tsx:207-220` | seção de insucesso aceita grupo misto (§3.3) |
| `_utils/routeCalculations.ts:296-305` | `findOutrasParadas` compara por `serviceId`, não por referência de objeto |

**Componente a reaproveitar:** `TransferOrderCard`/`TransferOrderList` já são "1 card por pedido, expansível, com outcome individual" dentro de uma tela única. É o padrão do índice da parada — não construir do zero.

---

## 6. O que NÃO muda

- O fluxo de entrega por pedido: foto, assinatura, checklist, código, insucesso, formulário dinâmico.
- `ParadaContext` continua ancorado num `serviceId` — cada nota abre a sua sessão.
- Draft e upload continuam chaveados por pedido (`paradaDraftStorage`).
- Nenhum endpoint, nenhum DTO, nenhuma migration.

---

## 7. Riscos

**A contiguidade não é verificada em lugar nenhum do app.** É garantia do backend, e o agrupamento por vizinhança depende dela. Numa rota **legada** — planejada antes da Camada 1, ou reordenada manualmente — os irmãos podem não estar contíguos, e aí a mesma porta vira duas paradas. É o comportamento seguro (nunca funde o que o itinerário separou), mas precisa estar escrito na tela e não surpreender.

**`findOutrasParadas` compara por referência de objeto** (`p !== proximaParada`, `routeCalculations.ts:301-302`). Funciona hoje porque a lista não é recriada entre os dois `useMemo`; com o agrupamento reconstruindo arrays, quebra em silêncio. Trocar por `serviceId` é parte do trabalho, não opcional.

**`hasMultipleParadasEmAndamento`** (`routeCalculations.ts:363-366`) dispara falso positivo enquanto os pedidos de um mesmo grupo têm status diferentes entre si — situação normal durante o atendimento.

---

## 8. Como provar

- 5 pedidos no mesmo endereço/cliente, contíguos → **1** parada com 5 pedidos
- 2 clientes no mesmo endereço → **2** paradas (a Camada 1 decidiu assim: dois recebedores, dois canhotos)
- pedidos do mesmo cliente **não contíguos** (rota legada) → **2** paradas, itinerário preservado
- parada de 1 pedido → comportamento idêntico ao atual, sem tela intermediária
- **"uma por vez" com irmãos:** iniciar a nota 1 NÃO bloqueia as notas 2–5 da mesma porta — mutação: remover a regra de irmãos e o teste fica vermelho
- 3 entregues + 2 insucesso → parada aparece em insucesso, com `3 de 5`
- mapa: 5 pedidos na mesma porta → **1** pino
- progresso: `12 de 26 paradas` e `34 de 56 notas`

O teste dos irmãos é o mais importante do conjunto: é ele que separa "feature entregue" de "motorista travado na primeira nota".

---

## 9. Fora de escopo

- Confirmação única para a porta inteira (§3.1) — exigiria refazer o `ParadaContext`.
- Agrupar por afinidade em vez de vizinhança — reordenaria o itinerário, que é decisão do planejamento.
- Retrofit de rotas legadas para tornar irmãos contíguos.
