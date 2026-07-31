/**
 * Derivações de EXIBIÇÃO da parada agrupada (Camada 2).
 *
 * São os dois itens da lista de aceite (§8) que acabam em texto na tela: o selo
 * de notas do card da parada e a linha de progresso da rota. Estavam inline nos
 * componentes, e este repo não tem teste de componente — um refactor de
 * `isGrupoMisto` ou da condição `notasTotal > total` regredia em silêncio.
 * Aqui a derivação é pura, testável e tem UM dono: o mesmo selo é usado pelo
 * card da lista e pela linha do "Concluídas com insucesso", que precisam
 * concordar sobre o que "3 de 5" significa.
 *
 * @module rotas-detalhadas/utils/paradaDisplay
 */

import type { ServiceResponse } from '@/domain/agility/service/dto'
import { ServiceStatus, ServiceType } from '@/domain/agility/service/dto/types'

import type { ParadaStatus } from '../_types/rota.types'

import type { ParadaCountResult } from './routeCalculations'

/** O que a parada precisa expor para o selo de notas. */
export interface NotasBadgeInput {
    status: ParadaStatus
    pedidos?: ServiceResponse[] | null
}

export interface NotasBadge {
    /** Notas da parada. Sem `pedidos`, cai para 1 — mesmo fallback de `countParadasByStatus`. */
    totalNotas: number
    /** Notas efetivamente entregues (isCompleted). */
    notasEntregues: number
    /** Parada de insucesso em que ALGUMA nota foi entregue (§3.3). */
    isGrupoMisto: boolean
    /** Texto do selo, ou null quando a parada tem uma nota só (não exibe selo). */
    label: string | null
}

/**
 * Texto do selo de notas. UM dono para a frase: o card da lista e a linha do
 * "Concluídas com insucesso" precisam dizer a mesma coisa sobre a mesma porta.
 *
 * `null` quando a parada tem uma nota só — aí não há selo, e a tela fica
 * idêntica ao que era antes do agrupamento.
 */
export function formatNotasLabel(
    totalNotas: number,
    notasEntregues: number,
    isGrupoMisto: boolean,
): string | null {
    if (totalNotas <= 1) return null
    return isGrupoMisto ? `${notasEntregues} de ${totalNotas} entregues` : `${totalNotas} notas`
}

/**
 * Selo de notas do card da parada.
 *
 * `N notas` no caso comum; `3 de 5 entregues` quando a parada fecha em insucesso
 * mas parte das notas foi entregue (§3.3) — é o recorte que não esconde do
 * operador que a porta foi parcialmente atendida.
 *
 * Parada de UMA nota devolve `label: null`: a tela fica idêntica ao que era
 * antes do agrupamento, que é a situação da maioria das empresas.
 */
export function resolveNotasBadge(parada: NotasBadgeInput): NotasBadge {
    const pedidos = parada.pedidos ?? []
    // `|| 1` (não `?? 1`): `pedidos` vazio significa "dado não carregado", e o
    // denominador tem que valer 1 nota — o mesmo critério que
    // `countParadasByStatus` usa, senão o card e o contador discordam.
    const totalNotas = pedidos.length || 1
    const notasEntregues = pedidos.filter((p) => p.isCompleted === true).length
    const isGrupoMisto = parada.status === 'concluida-insucesso' && notasEntregues > 0

    return {
        totalNotas,
        notasEntregues,
        isGrupoMisto,
        label: formatNotasLabel(totalNotas, notasEntregues, isGrupoMisto),
    }
}

/**
 * A PARADA está atendida quando QUALQUER nota dela já chegou (IN_ATTENDANCE) ou
 * passou disso — terminal (entregue/insucesso/cancelada) conta como "já
 * atendida" também, senão reabrir uma porta parcialmente concluída voltaria a
 * pedir chegada de novo.
 *
 * É o que substitui, na tela e no `ParadaContext`, o gate por SERVIÇO que
 * existia antes: chegada é propriedade da PORTA, não de cada nota (Camada 3,
 * §3 da spec) — uma vez que a primeira nota entra em atendimento, as demais não
 * pedem "Estou aqui" de novo, só entram em atendimento conforme são abertas
 * (`resolveNotaFiscalLabel`/tela do índice cuidam disso).
 *
 * Usa os MESMOS campos booleanos que o resto do código confia
 * (`isInAttendance`/`isCompleted`/`isCanceled`/`isFailed`, com o `status` como
 * fallback — igual a `useStopStatus`/`ParadaContext`), não uma lista de status
 * escrita à mão aqui. `isInProgress` ("a caminho") fica de fora de propósito:
 * é o mesmo corte que `EtapaInicial`/`hasArrivedAtLocation` já fazem — a
 * caminho ainda não é chegada, só o começo dela.
 */
export function resolveParadaAtendida(pedidos: ServiceResponse[]): boolean {
    return pedidos.some((pedido) => {
        const emAtendimento =
            pedido.isInAttendance === true || pedido.status === ServiceStatus.IN_ATTENDANCE
        const terminal =
            pedido.isCompleted === true || pedido.isCanceled === true || pedido.isFailed === true
        return emAtendimento || terminal
    })
}

/**
 * A parada tem alguma nota com uma ETAPA PRÓPRIA antes do atendimento — código
 * de retirada (PICKUP/TRANSFER, capturado por `PickupCodeCard` dentro de
 * `ColetaEtapaInicial`/`TransferEtapaInicial`) ou conferência de equipamento
 * (SERVICE, `ServiceEtapaCheckEquipamento`) — que só o fluxo da PRÓPRIA nota
 * sabe pedir.
 *
 * Usada para decidir se o ÍNDICE da parada (a tela nova da Camada 3) pode
 * "resolver" a chegada da porta sozinho ou se precisa recuar para o
 * comportamento de hoje. Regra deliberadamente simples (revisão de código,
 * ronda 2): a porta só é elegível para o bloco de chegada novo quando TODAS as
 * notas são DELIVERY — qualquer nota de outro tipo faz a porta inteira manter
 * o comportamento de hoje (lista de notas direto, sem `start-attendance`
 * disparado pelo índice), porque a porta não tem como perguntar, por outra
 * tela, o que só a própria nota sabe perguntar.
 *
 * ESTE RECUO É PERMANENTE, não dívida técnica — decisão do dono do produto em
 * 31/07/2026: o código de retirada e a conferência de equipamento são por NOTA,
 * vinculados ao `service`. E a chegada é onde esses controles são cobrados: no
 * backend, `startAttendance` é a MESMA transação que valida o código de retirada
 * (`Código de retirada inválido`, em `service.service.ts`); no app, a
 * conferência de equipamento gateia `!isServiceStarted`, ou seja, roda antes do
 * atendimento. Como o controle é por nota e a chegada o cobra, a chegada também
 * é por nota nesses tipos — não há "chegar na porta" sem já estar respondendo
 * pela nota.
 *
 * Só muda se o produto passar a tratar código/conferência como coisa da PORTA
 * (um código para o balcão, uma conferência para a carga inteira). Aí o backend
 * precisaria de um ponto de chegada por parada, e esta função sai de cena.
 *
 * NÃO reusa `resolveCodeRequirement`/`PICKUP_CHECKPOINT_TYPES`
 * (`@/domain/agility/service/codeGate`) — ver nota no report do Task 2: aquela
 * função responde "esta empresa exige código NESTE serviço", que depende de
 * `confirmationCode` (dado que, na prática, só a tela de UM serviço
 * (`useFindOneService`) lê — nenhum consumidor hoje lê `confirmationCode` a
 * partir da lista da rota). Esta função responde uma pergunta mais simples e
 * mais ampla — "este tipo tem ALGUM pré-passo próprio, código ou não" —
 * porque a conferência de equipamento (SERVICE) não depende de configuração
 * de código nenhuma. Uma regra só, sem depender do dado de `confirmationCode`
 * estar populado na lista.
 */
export function resolveTemEtapaPropriaAntesDoAtendimento(pedidos: ServiceResponse[]): boolean {
    return pedidos.some((pedido) => pedido.serviceType !== ServiceType.DELIVERY)
}

/**
 * A parada está ATENDIDA **e elegível** para o gate de chegada por PORTA — o
 * que `ParadaContext.isParadaAtendida` expõe.
 *
 * Revisão de código, ronda 3: um grupo `D` (mesmo sentido em `stopKeyOf`) pode
 * misturar DELIVERY e SERVICE. Sem o filtro de elegibilidade, `isParadaAtendida`
 * viraria `true` assim que a nota SERVICE entrasse em atendimento (via seu
 * próprio pré-passo de equipamento), e a nota DELIVERY do MESMO grupo pularia
 * `EtapaInicial` (`entrega/index.tsx`) achando que a porta já foi atendida —
 * sem NUNCA disparar o próprio `start-attendance` dela (o índice também
 * recusa, porque `mostraBlocoDeChegada`/`handleOpenNota` já veem o grupo como
 * não-elegível). A nota faria toda a conferência, foto e assinatura com o
 * backend ainda em PENDING.
 *
 * Por isso o índice (`mostraBlocoDeChegada`) e o fluxo
 * (`ParadaContext.isParadaAtendida`, via esta função) têm que concordar sobre
 * elegibilidade usando o MESMO predicado
 * (`resolveTemEtapaPropriaAntesDoAtendimento`) — se um recuar e o outro não, a
 * nota atravessa a etapa 1 sem nunca ter entrado em atendimento de verdade.
 *
 * Grupo NÃO elegível (alguma nota com etapa própria) sempre devolve `false`
 * aqui, mesmo com alguma nota em atendimento — o consumidor cai de volta para
 * `isServiceStarted` (por serviço), que é exatamente o comportamento de hoje.
 */
export function resolveParadaAtendidaElegivel(pedidos: ServiceResponse[]): boolean {
    return !resolveTemEtapaPropriaAntesDoAtendimento(pedidos) && resolveParadaAtendida(pedidos)
}

/**
 * A porta ainda tem OUTRA nota por trabalhar, depois de fechar `notaAtualId`
 * (entrega, coleta, serviço ou insucesso) — Task 5.
 *
 * **Cuidado com o cache**: a nota que acabou de fechar pode ainda não estar
 * terminal nesta lista em memória (o refetch que traria o status novo pode
 * não ter chegado). Por isso `notaAtualId` é SEMPRE excluído da checagem —
 * a decisão olha só para as OUTRAS notas do grupo, nunca depende de a
 * corrente já ter virado terminal. Sem essa exclusão explícita, a nota que
 * acabou de fechar contaria como "por trabalhar" enquanto o cache não
 * atualizasse, e o motorista nunca sairia da porta.
 *
 * Terminal = `COMPLETED`/`CANCELED`/`FAILED` (flags booleanas com fallback de
 * `status`, mesmo critério de `resolveParadaAtendida`/`useStopStatus`
 * acima). Pendente e em atendimento contam como "por trabalhar".
 *
 * Parada de UMA nota devolve `false` naturalmente: sem outra nota na lista,
 * não há nada além da corrente (que é sempre excluída) — o motorista volta
 * para a lista de paradas da rota, comportamento de hoje.
 */
export function temOutraNotaPorTrabalhar(pedidos: ServiceResponse[], notaAtualId: string): boolean {
    return pedidos.some((pedido) => {
        if (pedido.id === notaAtualId) return false
        const terminal =
            pedido.isCompleted === true ||
            pedido.isCanceled === true ||
            pedido.isFailed === true ||
            pedido.status === ServiceStatus.COMPLETED ||
            pedido.status === ServiceStatus.CANCELED ||
            pedido.status === ServiceStatus.FAILED
        return !terminal
    })
}

/** Campos do pedido que identificam a nota para quem está no balcão. */
export interface NotaFiscalInput {
    /** Número da NOTA FISCAL do pedido. */
    invoicing?: string | null
    /** Código interno do sistema (ex.: ARA-260513-1542-WMFR). Último recurso. */
    identificationCode?: string | null
}

/**
 * Identificação da nota no card do índice da parada.
 *
 * O motorista está no balcão com as notas de papel na mão e precisa casar papel
 * com tela. O que casa é o número da NOTA FISCAL (`invoicing`), não o
 * `identificationCode`, que é código interno do sistema e não aparece em lugar
 * nenhum do papel.
 *
 * Quando a NF vem só como número, ganha o prefixo `NF` para o motorista saber o
 * que está lendo — mas o prefixo NÃO é aplicado ao código interno, porque
 * chamá-lo de nota fiscal seria mentira. Sem nenhum dos dois, devolve `null` e o
 * card cai no ordinal ("Nota 2 de 5").
 */
export function resolveNotaFiscalLabel(pedido?: NotaFiscalInput | null): string | null {
    const nf = pedido?.invoicing?.trim()
    if (nf) {
        return /^nf/i.test(nf) ? nf : `NF ${nf}`
    }

    const interno = pedido?.identificationCode?.trim()
    return interno || null
}

/** Linha de apoio do card: posição da nota no grupo e, quando há, a janela dela. */
export function formatResumoDaNota(indice: number, total: number, janela?: string | null): string {
    const ordinal = `Nota ${indice} de ${total}`
    return janela ? `${ordinal} · ${janela}` : ordinal
}

/**
 * Texto da linha de progresso da rota.
 *
 * Paradas e notas são grandezas diferentes: 26 portas, 56 notas. O cliente já
 * opera com a distinção (a planilha tem as duas colunas). Quando cada parada tem
 * uma nota só — a maioria das empresas — o texto continua sendo o curto de
 * sempre, para não introduzir jargão onde não há ambiguidade.
 */
export function resolveProgressoTexto(contagem: ParadaCountResult): string {
    if (contagem.notasTotal > contagem.total) {
        return `${contagem.concluidas} de ${contagem.total} paradas · ${contagem.notasConcluidas} de ${contagem.notasTotal} notas`
    }
    return `${contagem.concluidas} de ${contagem.total} concluídas`
}
