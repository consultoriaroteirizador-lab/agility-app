/**
 * Hook para buscar e gerenciar dados da rota
 * 
 * Este hook encapsula toda a lógica de busca de dados da rota,
 * incluindo o mapeamento de serviços para paradas e cálculos de progresso.
 * 
 * @module rotas-detalhadas/hooks/useRouteDetails
 */

import { useMemo } from 'react'

import { useFindOneRouting, usePendingReturns, useRouteNonDelivered } from '@/domain/agility/routing/useCase'
import { useFindServicesByRoutingId } from '@/domain/agility/service/useCase'

import type { Parada, Rota, RotaStatus } from '../_types/rota.types'
import {
    buildDevolucaoList,
    buildInsucessoList,
    calculateProgress,
    collectLiveServiceIds,
    countLedgerOnly,
    countParadasByStatus,
    findOutrasParadas,
    findParadasConcluidas,
    findParadasConcluidasInsucesso,
    findParadasConcluidasSucesso,
    findProximaParada,
    getRotaStatus,
    hasMultipleParadasEmAndamento,
    intervaloDeReserva,
    isNenhumAndamento,
    mapServicesToParadas,
    withLedgerNonDelivered,
    type DevolucaoRow,
    type InsucessoRow,
    type ParadaCountResult,
} from '../_utils'

// ============================================
// TIPOS
// ============================================

/**
 * Retorno do hook useRouteDetails
 */
export interface UseRouteDetailsResult {
    /** Dados brutos da rota vindos do backend */
    routing: ReturnType<typeof useFindOneRouting>['routing']

    /** Lista de paradas formatadas e ordenadas */
    paradas: Parada[]

    /** Indica se está carregando dados iniciais */
    loading: boolean

    /** Indica se houve erro na busca */
    error: boolean

    /** Função para recarregar os dados */
    refresh: () => void

    /** Porcentagem de progresso da rota (0-100) */
    progress: number

    /** Objeto com dados agregados da rota */
    rota: Rota | null

    /** Status calculado da rota */
    status: RotaStatus

    /** Contagem de paradas por status */
    contagem: ParadaCountResult

    // ========================================
    // Paradas Derivadas
    // ========================================

    /** Próxima parada a ser realizada */
    proximaParada: Parada | null

    /** Outras paradas pendentes ou em andamento */
    outrasParadas: Parada[]

    /** Paradas concluídas com sucesso */
    paradasConcluidasSucesso: Parada[]

    /** Paradas concluídas com insucesso (só as que ficaram na rota) */
    paradasConcluidasInsucesso: Parada[]

    /**
     * Lista unificada do "Concluídas com insucesso": paradas de insucesso ao vivo
     * + ledger de não-entregues (cancelados / devolvidos à fila que saíram da
     * rota). Fonte da verdade do desfecho/motivo é o ledger. Cai para só-ao-vivo
     * quando o endpoint do ledger falha.
     */
    insucessoRows: InsucessoRow[]

    /**
     * "Devolver ao CD": o que o motorista ainda carrega e tem de entregar de
     * volta, direto das tentativas de devolução pendentes da rota.
     *
     * NÃO sai de `paradas` nem do ledger: o pedido cancelado com a carga na rua
     * perde a rota no mesmo gesto do cancelamento (some das paradas) e, no
     * ledger, quem vence o merge é a trilha do cancelamento, que traz
     * `awaitingReturn` fixo em falso. Lista vazia quando o endpoint falha.
     */
    devolucaoRows: DevolucaoRow[]

    /** Todas as paradas concluídas */
    paradasConcluidas: Parada[]

    /** Indica se não há paradas em andamento */
    nenhumAndamento: boolean

    /** Indica se há múltiplas paradas em andamento (aviso) */
    temMultiplasEmAndamento: boolean

    // ========================================
    // Estados de Loading Específicos
    // ========================================

    /** Indica se está carregando dados da rota */
    isLoadingRouting: boolean

    /** Indica se está carregando serviços */
    isLoadingServices: boolean

    /** Indica se está recarregando dados */
    isRefetching: boolean
}

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook para buscar e gerenciar dados da rota
 * 
 * @param rotaId - ID da rota a ser buscada
 * @returns Objeto com dados da rota, paradas, estados de loading e funções utilitárias
 * 
 * @example
 * ```tsx
 * const { 
 *   rota, 
 *   paradas, 
 *   loading, 
 *   progress, 
 *   proximaParada,
 *   refresh 
 * } = useRouteDetails('rota-123')
 * 
 * if (loading) return <ActivityIndicator />
 * 
 * return <RotaList paradas={paradas} progress={progress} />
 * ```
 */
export function useRouteDetails(rotaId: string | null | undefined): UseRouteDetailsResult {
    // Buscar dados da rota
    const {
        routing,
        isLoading: isLoadingRouting,
        isError,
        refetch,
        isRefetching,
    } = useFindOneRouting(rotaId)

    // Reserva de polling das duas buscas da tela, com UM intervalo só: duas
    // constantes iguais divergem na primeira vez que alguém mexe numa delas, e a
    // tela passaria a se atualizar em dois ritmos sem ninguém ter decidido isso.
    const reserva = intervaloDeReserva(routing?.isInProgress)

    // Buscar serviços da rota. Enquanto a rota está em andamento, faz polling de
    // fallback caso o socket /monitoring caia — as ETAs re-projetadas por
    // atraso continuam chegando à tela.
    const {
        services,
        isLoading: isLoadingServices,
    } = useFindServicesByRoutingId(rotaId ?? undefined, {
        refetchIntervalMs: reserva,
    })

    // ========================================
    // MAPEAMENTO DE PARADAS
    // ========================================

    /**
     * Lista de paradas formatadas e ordenadas
     * Memoizado para evitar recálculos desnecessários
     */
    // Endereço do retorno vem da routing (returnPoint já resolve origem quando
    // returnToOrigin); usado só na parada RETURN, que não tem service.address.
    const returnAddress = routing?.returnPoint?.address ?? routing?.returnAddress ?? null

    const paradas = useMemo(() => {
        if (!services || services.length === 0) {
            return []
        }
        return mapServicesToParadas(services, returnAddress)
    }, [services, returnAddress])

    // ========================================
    // CÁLCULOS DE STATUS E PROGRESSO
    // ========================================

    /**
     * Status calculado da rota baseado nas paradas
     */
    const status = useMemo(() => {
        return getRotaStatus(paradas)
    }, [paradas])

    // ========================================
    // PARADAS DERIVADAS
    // ========================================

    /**
     * Próxima parada (em andamento ou primeira pendente)
     */
    const proximaParada = useMemo(() => {
        return findProximaParada(paradas)
    }, [paradas])

    /**
     * Outras paradas pendentes ou em andamento
     */
    const outrasParadas = useMemo(() => {
        return findOutrasParadas(paradas, proximaParada)
    }, [paradas, proximaParada])

    /**
     * Paradas concluídas com sucesso
     */
    const paradasConcluidasSucesso = useMemo(() => {
        return findParadasConcluidasSucesso(paradas)
    }, [paradas])

    /**
     * Paradas concluídas com insucesso
     */
    const paradasConcluidasInsucesso = useMemo(() => {
        return findParadasConcluidasInsucesso(paradas)
    }, [paradas])

    // Ledger de não-entregues (cancelados / devolvidos à fila). Só faz sentido
    // buscar quando há rota. Em erro, `items` = [] e a lista cai para só-ao-vivo.
    const { items: nonDeliveredItems } = useRouteNonDelivered(rotaId ?? undefined, {
        enabled: !!rotaId,
    })

    /**
     * Lista unificada de insucesso (ao vivo + ledger), deduplicada por serviceId.
     */
    const insucessoRows = useMemo(() => {
        return buildInsucessoList(paradasConcluidasInsucesso, nonDeliveredItems)
    }, [paradasConcluidasInsucesso, nonDeliveredItems])

    // O que falta devolver ao CD. Mesma fonte que a parada de RETORNO confere
    // (`returnChecklist.ts`), para as duas telas não discordarem sobre quantas
    // caixas voltam. Em erro, `pendentes` = [] e a seção some — nunca inventa.
    //
    // Com a MESMA reserva de polling das paradas, de propósito: o cancelamento
    // que cria a devolução chega por push, e push em celular cai calado. Sem a
    // reserva, este card ficaria menos protegido que a lista de paradas logo
    // acima — na mesma tela e no mesmo hook —, o que se leria como esquecimento.
    const { pendentes } = usePendingReturns(rotaId ?? '', !!rotaId, {
        refetchIntervalMs: reserva,
    })

    /**
     * Linhas do "Devolver ao CD".
     *
     * O "ainda está na rota" vem de `collectLiveServiceIds` (ids por NOTA, de
     * todas as paradas), não do `serviceId` das paradas: com agrupamento aquele
     * campo é só o representante, e uma nota devolvida numa porta de cinco seria
     * marcada como "saiu da rota" estando ali na tela. Mesma escolha do
     * `ledgerOnlyCount`.
     */
    const devolucaoRows = useMemo(() => {
        return buildDevolucaoList(pendentes, collectLiveServiceIds(paradas))
    }, [pendentes, paradas])

    /**
     * Pedidos que saíram da rota (cancelado / devolvido à fila) — contados a
     * partir do ledger porque já não existem em `paradas`.
     *
     * A identidade do que "ainda está na rota" é por NOTA e vem de TODAS as
     * paradas (`collectLiveServiceIds`), não do `serviceId` das paradas de
     * insucesso: com o agrupamento aquele campo é só o representante, e uma nota
     * recusada numa porta de cinco seria contada como "saiu da rota" estando ali
     * na tela. É também o que a tela de histórico faz.
     */
    const ledgerOnlyCount = useMemo(() => {
        return countLedgerOnly(collectLiveServiceIds(paradas), nonDeliveredItems)
    }, [paradas, nonDeliveredItems])

    /**
     * Contagem de paradas por status, somando os não-entregues que saíram da
     * rota — senão a tela mostra "0 de 1 concluídas" com N cards de insucesso.
     */
    const contagem = useMemo(() => {
        return withLedgerNonDelivered(countParadasByStatus(paradas), ledgerOnlyCount)
    }, [paradas, ledgerOnlyCount])

    /**
     * Porcentagem de progresso da rota — deriva da contagem já mesclada com o
     * ledger, para não divergir do "X de Y concluídas" exibido ao lado.
     */
    const progress = useMemo(() => {
        return calculateProgress(contagem.concluidas, contagem.total)
    }, [contagem])

    /**
     * Todas as paradas concluídas
     */
    const paradasConcluidas = useMemo(() => {
        return findParadasConcluidas(paradas)
    }, [paradas])

    /**
     * Indica se não há paradas em andamento
     */
    const nenhumAndamento = useMemo(() => {
        return isNenhumAndamento(proximaParada, outrasParadas)
    }, [proximaParada, outrasParadas])

    /**
     * Indica se há múltiplas paradas em andamento (situação anormal)
     */
    const temMultiplasEmAndamento = useMemo(() => {
        return hasMultipleParadasEmAndamento(paradas)
    }, [paradas])

    // ========================================
    // OBJETO ROTA AGREGADO
    // ========================================

    /**
     * Objeto Rota com dados agregados para uso na UI
     */
    const rota = useMemo<Rota | null>(() => {
        if (!routing) {
            return null
        }

        return {
            id: routing.id,
            nome: routing.name,
            codigo: routing.code,
            status,
            paradas,
            totalParadas: contagem.total,
            paradasConcluidas: contagem.concluidas,
            paradasPendentes: contagem.pendentes,
            paradasEmAndamento: contagem.emAndamento,
        }
    }, [routing, status, paradas, contagem])

    // ========================================
    // RETORNO
    // ========================================

    return {
        // Dados principais
        routing,
        rota,
        paradas,
        progress,
        status,
        contagem,

        // Estados de loading
        loading: isLoadingRouting || isLoadingServices,
        error: isError,
        isLoadingRouting,
        isLoadingServices,
        isRefetching,

        // Funções
        refresh: refetch,

        // Paradas derivadas
        proximaParada,
        outrasParadas,
        paradasConcluidasSucesso,
        paradasConcluidasInsucesso,
        insucessoRows,
        devolucaoRows,
        paradasConcluidas,
        nenhumAndamento,
        temMultiplasEmAndamento,
    }
}
