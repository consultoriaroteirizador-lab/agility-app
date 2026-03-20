/**
 * Hook para navegação entre paradas
 * 
 * Este hook encapsula toda a lógica de navegação entre paradas
 * e rotas, usando o expo-router.
 * 
 * @module rotas-detalhadas/hooks/useParadaNavigation
 */

import { useCallback } from 'react'

import { useRouter } from 'expo-router'

import type { Parada } from '../_types/rota.types'

// ============================================
// TIPOS
// ============================================

/**
 * Retorno do hook useParadaNavigation
 */
export interface UseParadaNavigationResult {
    // ========================================
    // Navegação
    // ========================================

    /** Navega para a tela de detalhes de uma parada */
    navigateToStop: (parada: Parada) => void

    /** Navega para a tela de detalhes de uma parada pelo ID */
    navigateToStopById: (serviceId: string) => void

    /** Volta para a lista de rotas */
    backToRoutes: () => void

    /** Volta para a tela anterior */
    voltar: () => void

    /** Navega para a tela de edição de parada */
    navigateToStopEdit: (parada: Parada) => void
}

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook para navegação entre paradas
 * 
 * @param rotaId - ID da rota atual (usado para construir URLs de navegação)
 * @returns Objeto com funções de navegação
 * 
 * @example
 * ```tsx
 * const { 
 *   navigateToStop, 
 *   backToRoutes,
 *   voltar 
 * } = useParadaNavigation('rota-123')
 * 
 * // Navegar para detalhes de uma parada
 * <TouchableOpacity onPress={() => navigateToStop(parada)}>
 *   <Text>Ver detalhes</Text>
 * </TouchableOpacity>
 * 
 * // Voltar para lista de rotas
 * <Button title="Voltar" onPress={voltar} />
 * ```
 */
export function useParadaNavigation(rotaId: string): UseParadaNavigationResult {
    const router = useRouter()

    /**
     * Navega para a tela de detalhes de uma parada
     * 
     * @param parada - Objeto Parada com os dados da parada
     */
    const navigateToStop = useCallback(
        (parada: Parada) => {
            if (!parada.serviceId) {
                console.error('[useParadaNavigation] serviceId não encontrado para parada:', parada)
                return
            }

            router.push({
                pathname: '/rotas-detalhadas/[id]/parada/[pid]' as const,
                params: {
                    id: rotaId,
                    pid: parada.serviceId,
                },
            })
        },
        [router, rotaId]
    )

    /**
     * Navega para a tela de detalhes de uma parada pelo ID do serviço
     * 
     * @param serviceId - ID do serviço/parada
     */
    const navigateToStopById = useCallback(
        (serviceId: string) => {
            if (!serviceId) {
                console.error('[useParadaNavigation] serviceId não fornecido')
                return
            }

            router.push({
                pathname: '/rotas-detalhadas/[id]/parada/[pid]' as const,
                params: {
                    id: rotaId,
                    pid: serviceId,
                },
            })
        },
        [router, rotaId]
    )

    /**
     * Volta para a lista de rotas (nível superior)
     */
    const backToRoutes = useCallback(() => {
        // Navega para a tab de rotas usando dismiss para fechar todas as telas empilhadas
        router.dismissAll()
    }, [router])

    /**
     * Volta para a tela anterior
     */
    const voltar = useCallback(() => {
        router.back()
    }, [router])

    /**
     * Navega para a tela de edição de parada
     * (funcionalidade futura - placeholder)
     * 
     * @param parada - Objeto Parada com os dados da parada
     */
    const navigateToStopEdit = useCallback(
        (parada: Parada) => {
            if (!parada.serviceId) {
                console.error('[useParadaNavigation] serviceId não encontrado para parada:', parada)
                return
            }

            console.warn('[useParadaNavigation] Tela de edição de parada não implementada')
        },
        [rotaId]
    )

    return {
        // Navegação
        navigateToStop,
        navigateToStopById,
        backToRoutes,
        voltar,
        navigateToStopEdit,
    }
}
