/**
 * Hook para buscar e gerenciar dados da rota
 * 
 * Este hook encapsula toda a lógica de busca de dados da rota,
 * incluindo o mapeamento de serviços para paradas e cálculos de progresso.
 * 
 * @module rotas-detalhadas/hooks/useRouteDetails
 */

import { useMemo } from 'react'

import { useFindOneRouting } from '@/domain/agility/routing/useCase'
import { useFindServicesByRoutingId } from '@/domain/agility/service/useCase'

import type { Parada, Rota, RotaStatus } from '../_types/rota.types'
import {
    calculateProgressFromParadas,
    countParadasByStatus,
    findOutrasParadas,
    findParadasConcluidas,
    findParadasConcluidasInsucesso,
    findParadasConcluidasSucesso,
    findProximaParada,
    getRotaStatus,
    hasMultipleParadasEmAndamento,
    isNenhumAndamento,
    mapServicesToParadas,
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
    contagem: {
        total: number
        pendentes: number
        emAndamento: number
        concluidasSucesso: number
        concluidasInsucesso: number
        concluidas: number
    }

    // ========================================
    // Paradas Derivadas
    // ========================================

    /** Próxima parada a ser realizada */
    proximaParada: Parada | null

    /** Outras paradas pendentes ou em andamento */
    outrasParadas: Parada[]

    /** Paradas concluídas com sucesso */
    paradasConcluidasSucesso: Parada[]

    /** Paradas concluídas com insucesso */
    paradasConcluidasInsucesso: Parada[]

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

    // Buscar serviços da rota
    const {
        services,
        isLoading: isLoadingServices,
    } = useFindServicesByRoutingId(rotaId ?? undefined)

    // ========================================
    // MAPEAMENTO DE PARADAS
    // ========================================

    /**
     * Lista de paradas formatadas e ordenadas
     * Memoizado para evitar recálculos desnecessários
     */
    const paradas = useMemo(() => {
        if (!services || services.length === 0) {
            return []
        }
        return mapServicesToParadas(services)
    }, [services])

    // ========================================
    // CÁLCULOS DE STATUS E PROGRESSO
    // ========================================

    /**
     * Status calculado da rota baseado nas paradas
     */
    const status = useMemo(() => {
        return getRotaStatus(paradas)
    }, [paradas])

    /**
     * Porcentagem de progresso da rota
     */
    const progress = useMemo(() => {
        return calculateProgressFromParadas(paradas)
    }, [paradas])

    /**
     * Contagem de paradas por status
     */
    const contagem = useMemo(() => {
        return countParadasByStatus(paradas)
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
        paradasConcluidas,
        nenhumAndamento,
        temMultiplasEmAndamento,
    }
}
