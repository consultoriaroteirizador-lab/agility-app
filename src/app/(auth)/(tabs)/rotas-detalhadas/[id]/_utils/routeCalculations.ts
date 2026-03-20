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

import { mapServiceToParada } from './statusMappers'

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
}

// ============================================
// FUNÇÕES DE ORDENAÇÃO
// ============================================

/**
 * Ordena serviços por sequenceOrder
 * 
 * @param services - Lista de serviços do backend
 * @returns Lista de serviços ordenada por sequenceOrder
 * 
 * @example
 * const sorted = getParadasOrdenadas(services)
 * // Retorna serviços ordenados por sequenceOrder
 */
export function getParadasOrdenadas(services: ServiceResponse[]): ServiceResponse[] {
    if (!services || services.length === 0) {
        return []
    }

    return [...services].sort((a, b) => {
        const orderA = a.sequenceOrder ?? 999
        const orderB = b.sequenceOrder ?? 999
        return orderA - orderB
    })
}

// ============================================
// FUNÇÕES DE MAPEAMENTO
// ============================================

/**
 * Converte lista de serviços em lista de paradas ordenadas
 * 
 * @param services - Lista de serviços do backend
 * @returns Lista de paradas ordenadas e formatadas
 * 
 * @example
 * const paradas = mapServicesToParadas(services)
 * // [{ numero: 1, serviceId: 'abc', nome: 'Cliente', ... }, ...]
 */
export function mapServicesToParadas(services: ServiceResponse[]): Parada[] {
    const sortedServices = getParadasOrdenadas(services)
    return sortedServices.map((service, index) => mapServiceToParada(service, index))
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
    }

    for (const parada of paradas) {
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
 * Encontra a próxima parada (primeira pendente ou em andamento)
 * 
 * Prioridade: em-andamento > pendente
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

    // Prioridade: em-andamento > pendente
    const emAndamento = paradas.find(p => p.status === 'em-andamento')
    if (emAndamento) {
        return emAndamento
    }

    return paradas.find(p => p.status === 'pendente') ?? null
}

/**
 * Encontra outras paradas pendentes ou em andamento (excluindo a próxima)
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

    return paradas.filter(p =>
        p !== proximaParada && (p.status === 'pendente' || p.status === 'em-andamento')
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
