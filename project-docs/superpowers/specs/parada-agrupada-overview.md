# Parada agrupada — overview para reaproveitar em SERVICE

Resumo do que foi feito para agrupar **notas fiscais numa parada**, escrito para quem
vai aplicar a mesma estratégia a **ordens de serviço** (`serviceType = SERVICE`).

## O problema

`Service` acumula dois papéis: é o **pedido** e é a **parada**. O app herdou isso —
uma parada por `Service`. Com os dados reais do cliente, o motorista veria 56 paradas
onde são 26: a mesma porta cinco vezes seguidas, cada uma com check-in, foto e canhoto
próprios.

A mesma confusão vai aparecer em SERVICE: várias ordens de serviço no mesmo local
viram várias "paradas".

## Como ficou: três camadas

| Camada | Onde | O que faz |
|---|---|---|
| **1** | `agility-services` (#427) | O **otimizador** agrupa e emite os pedidos de uma parada com `sequenceOrder` CONTÍGUO. É aqui que nasce a chave canônica. |
| **2** | `lab-app` (#22) | **Leitura**: lista, contagem, mapa e a tela da parada passam a falar em paradas, não em pedidos. |
| **3** | ambos (#435 + #22) | **Execução**: o gate de "uma parada por vez" aprende o que é uma parada, e a chegada sobe para o nível da porta. |

## A chave canônica — o coração de tudo

Mora em `agility-services/src/optimization/constants/stop-grouping.ts`:

```
`${addressId ?? 'sem-endereco:<id>'}|${customerId ?? taxNumber ?? 'sem-cliente'}|${sentido}`

sentido: PICKUP → 'P' | TRANSFER → 'T' | qualquer outro → 'D'
```

Regras embutidas que não são óbvias:

- **Cliente não identificado agrupa por endereço** (`sem-cliente`) — fisicamente continua
  sendo uma porta só.
- **A cascata para em `taxNumber`.** `identificationCode` já foi um degrau a mais e foi
  removido de propósito, para os pipelines não divergirem.
- **TRANSFER e RETURN nunca agrupam** — caem em chave própria via `addressId: undefined`.
- **SERVICE tem sentido `'D'`, igual a DELIVERY.** Ou seja: hoje uma entrega e uma ordem
  de serviço no mesmo endereço/cliente **já agrupam juntas**. Se isso não for desejado
  para ordens de serviço, o ajuste é dar um sentido próprio a SERVICE — decisão a tomar
  antes de codar.

## As cinco regras que valem para qualquer agrupamento

1. **Uma definição de parada, um dono.** Otimizador, gate de execução e app leem a MESMA
   função. Quando o app inventou a própria chave, ele desagrupava o que o otimizador
   agrupava (backend via 1 parada, app mostrava 3).
2. **Agrupar por VIZINHANÇA, nunca por afinidade.** Só funde pedidos ADJACENTES na ordem
   do itinerário (`groupAdjacentServicesIntoStops`). Afinidade reordenaria o que o
   otimizador decidiu, e abriria buraco na regra de ordem.
3. **Aditivo.** `Parada` mantém `serviceId` (agora o do pedido representante, `grupo[0]`)
   e ganha `pedidos[]`. Assim os ~68 arquivos que só leem `Parada` continuam funcionando.
4. **O gate tem que saber o que é uma parada — nos DOIS lados.** "Uma parada por vez" e
   "seguir a ordem" comparavam `service.id` individual, então as notas 2..N da mesma
   porta se bloqueavam. Corrigir só no app não adianta: o servidor continua recusando.
5. **Chegada é da PORTA; confirmação é da NOTA.** Chega uma vez, depois confirma uma a
   uma. **Exceção importante:** quando o tipo tem uma etapa própria ANTES do atendimento,
   a chegada volta a ser por nota — porque é na chegada que esse controle é cobrado.
   Vale para PICKUP/TRANSFER (código de retirada, validado dentro do próprio
   `startAttendance`) e **para SERVICE (conferência de equipamento)**. Decisão do dono do
   produto: esses controles são por nota, vinculados ao `service` — então é permanente,
   não é dívida.

## As armadilhas que custaram caro

**A divergência entre repositórios não aparece em teste de unidade.** Os dois defeitos
mais graves viviam na fronteira: o gate do backend tinha exatamente o mesmo bug que já
tinha sido corrigido no app, e a chave do app não era a canônica. Nenhum teste dos dois
lados alcançava. O que fecha isso é um **teste de paridade** no app com casos levantados
do spec do backend — mesma entrada, mesma chave.

**Não existe atalho por status.** `VALID_TRANSITIONS` não tem `PENDING → COMPLETED`: toda
nota precisa passar por atendimento. Então não dá para "só concluir" as notas 2..N e
contornar o gate.

**Tela concluída continua montada.** O destino final usa `push`, que empilha em vez de
substituir. Uma tela de nota já fechada seguia viva e, a cada refetch, re-armava seu
timer de redirect e arrastava o motorista para fora de onde ele estava. Quem arma
redirect em `useEffect` precisa de função com **identidade estável** — senão re-arma para
sempre.

**A ordem de entrega importa.** Sempre: gate do servidor primeiro (é mais permissivo,
seguro sozinho), depois a chave no app, depois o fluxo. Invertido, o app promete o que o
servidor nega.

## Onde está o código

**Backend** (`agility-services`)
- `src/optimization/constants/stop-grouping.ts` — chave canônica e agrupamento
- `src/service/service/service.service.ts` → `validateStopStartConstraints` — o gate por parada

**App** (`lab-app`, tudo sob `src/app/(auth)/(tabs)/rotas-detalhadas/[id]/`)
- `_utils/stopGrouping.ts` — espelho da chave canônica (+ chave dos pinos do mapa)
- `_utils/routeCalculations.ts` — `mapServicesToParadas`, `resolvePedidosDaParada`, contagens
- `_utils/statusMappers.ts` — `mapGrupoToParada`, status agregado da parada
- `_utils/paradaDisplay.ts` — derivações de tela (selo de notas, progresso, elegibilidade)
- `parada/[pid]/index.tsx` — índice das notas + chegada da porta
- `parada/[pid]/_context/ParadaContext.tsx` — `isParadaAtendida` (a pergunta por PORTA)
- `parada/[pid]/_hooks/useStopStatus.ts` — gate no app (irmãos não se bloqueiam)

**Specs**
- `agility-services/project-docs/superpowers/specs/2026-07-29-parada-agrupada-camada1-otimizador-design.md`
- `agility-services/project-docs/superpowers/specs/2026-07-31-parada-agrupada-camada3-execucao-design.md`
- `lab-app/project-docs/superpowers/specs/2026-07-30-parada-agrupada-app-camada2-design.md`

## O que provavelmente muda para SERVICE

1. **Decidir o sentido.** SERVICE hoje agrupa junto com DELIVERY (ambos `'D'`). Ordem de
   serviço deve agrupar só com ordem de serviço? Se sim, sentido próprio na chave — e a
   mudança é no backend, com o app espelhando.
2. **A conferência de equipamento manda no fluxo.** Enquanto ela for por ordem, a chegada
   continua por ordem e a tela-índice não assume a chegada. Se a operação aceitar uma
   conferência por LOCAL, aí a porta pode assumir a chegada como no last-mile.
3. **O resto vem de graça.** Chave, agrupamento contíguo, gate por parada, contagem de
   paradas × ordens, um pino por parada e a tela-índice já existem e são agnósticas de
   tipo.
