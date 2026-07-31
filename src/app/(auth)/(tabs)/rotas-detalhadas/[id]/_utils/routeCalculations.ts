/**
 * Utilitários de Cálculo de Rota
 * 
 * Este arquivo contém funções puras para cálculos relacionados
 * a rotas e paradas, como progresso, contagem e filtragem.
 * 
 * @module rotas-detalhadas/utils/routeCalculations
 */

import type { ServiceResponse } from '@/domain/agility/service/dto'

import type {
    Parada,
    ParadaStatus,
    RotaTabType,
} from '../_types/rota.types'

import { isParadaConcluida, mapGrupoToParada } from './statusMappers'
import { contarChavesRepetidas, findGrupoDoServico, groupContiguousStops } from './stopGrouping'

// ============================================
// TIPOS
// ============================================

/**
 * Resultado da contagem de paradas por status
 */
export interface ParadaCountResult {
    /** Total de paradas */
    total: number
    /** Paradas pendentes */
    pendentes: number
    /** Paradas em andamento */
    emAndamento: number
    /** Paradas concluídas com sucesso */
    concluidasSucesso: number
    /** Paradas concluídas com insucesso */
    concluidasInsucesso: number
    /** Total de paradas concluídas (sucesso + insucesso) */
    concluidas: number
    /** Total de NOTAS (pedidos) — a parada pode ter várias. */
    notasTotal: number
    /** Notas em estado terminal (entregue, cancelada ou insucesso). */
    notasConcluidas: number
}

// ============================================
// FUNÇÕES DE ORDENAÇÃO
// ============================================

/**
 * Ordena serviços por sequenceOrder
 *
 * ÚNICO comparador de sequenceOrder do módulo — a tela (índice de notas) e o
 * gate de "uma parada por vez" (`useStopStatus`) precisam concordar sobre a
 * ordem do itinerário para concordar sobre o que é "uma parada"; duas cópias
 * inline com fallbacks diferentes (`?? 999` vs `?? Number.MAX_SAFE_INTEGER`)
 * já divergiram no passado. Genérico só no TIPO (não no comportamento) para
 * servir tanto `ServiceResponse[]` quanto o subconjunto de campos que
 * `useStopStatus` usa nos seus testes — o fallback `?? 999` não muda.
 *
 * @param services - Lista de serviços do backend
 * @returns Lista de serviços ordenada por sequenceOrder
 *
 * @example
 * const sorted = getParadasOrdenadas(services)
 * // Retorna serviços ordenados por sequenceOrder
 */
export function getParadasOrdenadas<T extends { sequenceOrder?: number | null }>(services: T[]): T[] {
    if (!services || services.length === 0) {
        return []
    }

    return [...services].sort((a, b) => {
        const orderA = a.sequenceOrder ?? 999
        const orderB = b.sequenceOrder ?? 999
        return orderA - orderB
    })
}

/**
 * Pedidos da MESMA PARADA que `serviceId` — ordenados pelo itinerário
 * (`getParadasOrdenadas`) e agrupados por vizinhança contígua
 * (`groupContiguousStops`). Extraída para ser testável isoladamente: é a
 * derivação que a tela do índice de notas (Task 5) usa para decidir se
 * mostra o fluxo de entrega direto (1 pedido) ou o índice (N>1).
 *
 * `serviceId` desconhecido (ainda não carregado na lista da rota) devolve
 * `[]` — comportamento seguro para quem chama antes do fetch terminar.
 */
export function resolvePedidosDaParada(services: ServiceResponse[], serviceId: string): ServiceResponse[] {
    const ordenados = getParadasOrdenadas(services)
    const grupos = groupContiguousStops(ordenados)
    return findGrupoDoServico(grupos, serviceId) ?? []
}

/**
 * Ids de TODOS os pedidos que ainda estão na rota — um por nota, não um por
 * parada.
 *
 * É a identidade que o dedup do ledger de não-entregues (`countLedgerOnly`)
 * precisa. Com o agrupamento, `parada.serviceId` é apenas o REPRESENTANTE
 * (`pedidos[0]`): passar só ele deixaria as notas 2..N invisíveis ao dedup, e
 * uma nota recusada numa porta de cinco seria contada como "saiu da rota"
 * estando ali na tela — inflando total e notas de uma vez.
 *
 * Cobre TODAS as paradas, não só as de insucesso: uma nota pode fechar em
 * insucesso enquanto as irmãs seguem pendentes, e nesse momento a parada ainda
 * não é de insucesso. É também o que a tela de histórico faz (passa todos os
 * ids dos serviços) — sem isto a mesma rota reporta números diferentes nas duas
 * telas.
 *
 * Sem `pedidos` (dado não carregado), cai para o próprio `serviceId`.
 */
export function collectLiveServiceIds(paradas: Parada[]): string[] {
    return paradas.flatMap((p) => (p.pedidos?.length ? p.pedidos.map((s) => s.id) : [p.serviceId]))
}

// ============================================
// FUNÇÕES DE MAPEAMENTO
// ============================================

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

// ============================================
// FUNÇÕES DE CÁLCULO DE PROGRESSO
// ============================================

/**
 * Calcula a porcentagem de progresso da rota
 * 
 * @param paradasConcluidas - Número de paradas concluídas
 * @param totalParadas - Total de paradas
 * @returns Porcentagem de progresso (0-100)
 * 
 * @example
 * calculateProgress(5, 10) // 50
 * calculateProgress(0, 10) // 0
 * calculateProgress(10, 10) // 100
 */
export function calculateProgress(paradasConcluidas: number, totalParadas: number): number {
    if (totalParadas === 0) {
        return 0
    }

    const progress = (paradasConcluidas / totalParadas) * 100
    return Math.min(Math.max(Math.round(progress), 0), 100)
}

/**
 * Calcula o progresso da rota baseado na lista de paradas
 * 
 * @param paradas - Lista de paradas
 * @returns Porcentagem de progresso (0-100)
 * 
 * @example
 * calculateProgressFromParadas(paradas) // 50
 */
export function calculateProgressFromParadas(paradas: Parada[]): number {
    if (!paradas || paradas.length === 0) {
        return 0
    }

    const concluidas = paradas.filter(p =>
        p.status === 'concluida-sucesso' || p.status === 'concluida-insucesso'
    ).length

    return calculateProgress(concluidas, paradas.length)
}

// ============================================
// FUNÇÕES DE CONTAGEM
// ============================================

/**
 * Conta paradas por status
 * 
 * @param paradas - Lista de paradas
 * @returns Objeto com contagens por status
 * 
 * @example
 * countParadasByStatus(paradas)
 * // { total: 10, pendentes: 3, emAndamento: 1, concluidasSucesso: 5, concluidasInsucesso: 1, concluidas: 6 }
 */
export function countParadasByStatus(paradas: Parada[]): ParadaCountResult {
    const result: ParadaCountResult = {
        total: paradas.length,
        pendentes: 0,
        emAndamento: 0,
        concluidasSucesso: 0,
        concluidasInsucesso: 0,
        concluidas: 0,
        notasTotal: 0,
        notasConcluidas: 0,
    }

    for (const parada of paradas) {
        // O numerador (notasConcluidas) e o denominador (notasTotal) precisam
        // concordar sobre o que "1 nota" significa quando `pedidos` está ausente
        // — se o denominador cai para 1 (a própria parada) mas o numerador
        // continua filtrando um array vazio (sempre 0), a parada concluída
        // reporta "0 de 1" e o "X de Y notas" que o cliente lê mente sem erro
        // nenhum. No fallback, deriva-se a nota única do status da própria
        // parada com o mesmo `isParadaConcluida` que decide `concluidas` acima.
        const pedidos = parada.pedidos ?? []
        result.notasTotal += pedidos.length || 1
        result.notasConcluidas += pedidos.length
            ? pedidos.filter((p) => p.isCompleted === true || p.isCanceled === true || p.isFailed === true).length
            : (isParadaConcluida(parada.status) ? 1 : 0)

        switch (parada.status) {
            case 'pendente':
                result.pendentes++
                break
            case 'em-andamento':
                result.emAndamento++
                break
            case 'concluida-sucesso':
                result.concluidasSucesso++
                break
            case 'concluida-insucesso':
                result.concluidasInsucesso++
                break
        }
    }

    result.concluidas = result.concluidasSucesso + result.concluidasInsucesso

    return result
}

/**
 * Soma à contagem os pedidos que saíram da rota (cancelados / devolvidos à fila)
 * e por isso não estão mais em `paradas` — eles vêm do ledger de não-entregues.
 *
 * Sem isto, a rota mostra "0 de 1 concluídas / 0%" enquanto exibe N cards em
 * "Concluídas com insucesso": o denominador ignora tudo que saiu da rota. O
 * motorista tratou o pedido, então ele conta como concluído (com insucesso) e
 * entra no total. `pendentes` e `emAndamento` não mudam — ninguém volta a ser
 * trabalho a fazer.
 *
 * `ledgerOnly` deve vir de `countLedgerOnly` (já deduplicado e sem os pedidos
 * que ainda têm parada viva, para não contar duas vezes).
 */
export function withLedgerNonDelivered(
    base: ParadaCountResult,
    ledgerOnly: number,
): ParadaCountResult {
    if (!ledgerOnly || ledgerOnly <= 0) return base

    return {
        ...base,
        total: base.total + ledgerOnly,
        concluidasInsucesso: base.concluidasInsucesso + ledgerOnly,
        concluidas: base.concluidas + ledgerOnly,
        notasTotal: base.notasTotal + ledgerOnly,
        notasConcluidas: base.notasConcluidas + ledgerOnly,
    }
}

// ============================================
// FUNÇÕES DE FILTRAGEM
// ============================================

/**
 * Filtra paradas por tab (andamento/concluido)
 * 
 * @param paradas - Lista de paradas
 * @param tab - Tab ativa ('andamento' ou 'concluido')
 * @returns Lista de paradas filtrada
 * 
 * @example
 * filterParadasByTab(paradas, 'andamento')
 * // Retorna paradas pendentes ou em andamento
 * 
 * filterParadasByTab(paradas, 'concluido')
 * // Retorna paradas concluídas (sucesso ou insucesso)
 */
export function filterParadasByTab(paradas: Parada[], tab: RotaTabType): Parada[] {
    if (!paradas || paradas.length === 0) {
        return []
    }

    if (tab === 'andamento') {
        return paradas.filter(p => p.status === 'pendente' || p.status === 'em-andamento')
    }

    // tab === 'concluido'
    return paradas.filter(p =>
        p.status === 'concluida-sucesso' || p.status === 'concluida-insucesso'
    )
}

/**
 * Filtra paradas por status específico
 * 
 * @param paradas - Lista de paradas
 * @param status - Status a filtrar
 * @returns Lista de paradas com o status especificado
 * 
 * @example
 * filterParadasByStatus(paradas, 'pendente')
 * // Retorna apenas paradas pendentes
 */
export function filterParadasByStatus(paradas: Parada[], status: ParadaStatus): Parada[] {
    if (!paradas || paradas.length === 0) {
        return []
    }

    return paradas.filter(p => p.status === status)
}

/**
 * Filtra paradas por múltiplos status
 * 
 * @param paradas - Lista de paradas
 * @param statuses - Lista de status a filtrar
 * @returns Lista de paradas com um dos status especificados
 * 
 * @example
 * filterParadasByStatuses(paradas, ['pendente', 'em-andamento'])
 * // Retorna paradas pendentes ou em andamento
 */
export function filterParadasByStatuses(paradas: Parada[], statuses: ParadaStatus[]): Parada[] {
    if (!paradas || paradas.length === 0) {
        return []
    }

    return paradas.filter(p => statuses.includes(p.status))
}

// ============================================
// FUNÇÕES DE BUSCA
// ============================================

/**
 * Encontra a próxima parada (em atendimento, em andamento ou pendente)
 *
 * Prioridade: em-atendimento > em-andamento > pendente
 * 
 * @param paradas - Lista de paradas
 * @returns Próxima parada ou null se não houver
 * 
 * @example
 * const proxima = findProximaParada(paradas)
 * // Retorna a primeira parada em andamento ou pendente
 */
export function findProximaParada(paradas: Parada[]): Parada | null {
    if (!paradas || paradas.length === 0) {
        return null
    }

    // Prioridade: em-atendimento (motorista já está na parada) > em-andamento > pendente
    const emAtendimento = paradas.find(p => p.status === 'em-atendimento')
    if (emAtendimento) {
        return emAtendimento
    }

    const emAndamento = paradas.find(p => p.status === 'em-andamento')
    if (emAndamento) {
        return emAndamento
    }

    return paradas.find(p => p.status === 'pendente') ?? null
}

/**
 * Encontra outras paradas ativas (pendente, em andamento ou em atendimento), excluindo a próxima
 * 
 * @param paradas - Lista de paradas
 * @param proximaParada - Próxima parada a ser excluída
 * @returns Lista de outras paradas ativas
 * 
 * @example
 * const outras = findOutrasParadas(paradas, proximaParada)
 * // Retorna paradas pendentes/em-andamento exceto a próxima
 */
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

/**
 * Encontra paradas concluídas com sucesso
 * 
 * @param paradas - Lista de paradas
 * @returns Lista de paradas concluídas com sucesso
 */
export function findParadasConcluidasSucesso(paradas: Parada[]): Parada[] {
    return filterParadasByStatus(paradas, 'concluida-sucesso')
}

/**
 * Encontra paradas concluídas com insucesso
 * 
 * @param paradas - Lista de paradas
 * @returns Lista de paradas concluídas com insucesso
 */
export function findParadasConcluidasInsucesso(paradas: Parada[]): Parada[] {
    return filterParadasByStatus(paradas, 'concluida-insucesso')
}

/**
 * Encontra todas as paradas concluídas (sucesso ou insucesso)
 * 
 * @param paradas - Lista de paradas
 * @returns Lista de paradas concluídas
 */
export function findParadasConcluidas(paradas: Parada[]): Parada[] {
    return filterParadasByStatuses(paradas, ['concluida-sucesso', 'concluida-insucesso'])
}

// ============================================
// FUNÇÕES DE VALIDAÇÃO
// ============================================

/**
 * Verifica se não há paradas em andamento ou pendentes
 * 
 * @param paradas - Lista de paradas
 * @returns true se todas as paradas estão concluídas
 */
export function isRotaConcluida(paradas: Parada[]): boolean {
    if (!paradas || paradas.length === 0) {
        return true
    }

    return paradas.every(p =>
        p.status === 'concluida-sucesso' || p.status === 'concluida-insucesso'
    )
}

/**
 * Verifica se há múltiplas paradas em andamento
 * 
 * @param paradas - Lista de paradas
 * @returns true se houver mais de uma parada em andamento
 */
export function hasMultipleParadasEmAndamento(paradas: Parada[]): boolean {
    const emAndamento = paradas.filter(p => p.status === 'em-andamento')
    return emAndamento.length > 1
}

/**
 * Verifica se não há nenhuma parada em andamento
 * 
 * @param proximaParada - Próxima parada
 * @param outrasParadas - Outras paradas ativas
 * @returns true se não houver paradas ativas
 */
export function isNenhumAndamento(proximaParada: Parada | null, outrasParadas: Parada[]): boolean {
    return !proximaParada && outrasParadas.length === 0
}
