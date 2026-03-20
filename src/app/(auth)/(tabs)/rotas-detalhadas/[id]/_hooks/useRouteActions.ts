/**
 * Hook para ações na rota
 * 
 * Este hook encapsula todas as ações que podem ser executadas
 * em uma rota, como iniciar, concluir e abrir navegação.
 * 
 * @module rotas-detalhadas/hooks/useRouteActions
 */

import { useCallback, useState } from 'react'
import { Linking, Platform } from 'react-native'

import { useCompleteRouting, useStartRouting } from '@/domain/agility/routing/useCase'
import { useToastService } from '@/services/Toast/useToast'
import type { Id } from '@/types/base'

import type { Parada } from '../_types/rota.types'

// ============================================
// TIPOS
// ============================================

/**
 * Opções de navegação disponíveis
 */
export type NavigationApp = 'waze' | 'googleMaps' | 'appleMaps'

/**
 * Dados de localização para navegação
 */
export interface NavigationLocation {
    /** Latitude do destino */
    latitude: number
    /** Longitude do destino */
    longitude: number
    /** Nome do local (opcional) */
    name?: string
    /** Endereço formatado (opcional) */
    address?: string
}

/**
 * Opções do hook useRouteActions
 */
export interface UseRouteActionsOptions {
    /** Callback executado ao iniciar a rota com sucesso */
    onRouteStarted?: () => void
    /** Callback executado ao concluir a rota com sucesso */
    onRouteCompleted?: () => void
    /** Callback executado em caso de erro ao iniciar */
    onStartError?: (error: unknown) => void
    /** Callback executado em caso de erro ao concluir */
    onCompleteError?: (error: unknown) => void
}

/**
 * Retorno do hook useRouteActions
 */
export interface UseRouteActionsResult {
    // ========================================
    // Ações
    // ========================================

    /** Inicia a rota */
    startRoute: () => void

    /** Conclui a rota */
    completeRoute: () => void

    /** Abre navegação para uma parada */
    openNavigation: (parada: Parada) => void

    /** Abre navegação com coordenadas específicas */
    openNavigationWithCoords: (location: NavigationLocation, app?: NavigationApp) => Promise<boolean>

    // ========================================
    // Estados de Loading
    // ========================================

    /** Indica se está iniciando a rota */
    isStarting: boolean

    /** Indica se está concluindo a rota */
    isCompleting: boolean

    /** Indica se alguma ação está em andamento */
    isLoading: boolean

    // ========================================
    // Estados de UI
    // ========================================

    /** Indica se o popup de confirmação de conclusão está visível */
    popupConcluirRota: boolean

    /** Define a visibilidade do popup de conclusão */
    setPopupConcluirRota: (visible: boolean) => void

    /** Indica se o popup de navegação está visível */
    navigationPopup: boolean

    /** Define a visibilidade do popup de navegação */
    setNavigationPopup: (visible: boolean) => void

    /** Parada selecionada para navegação */
    navigationStop: Parada | null

    /** Define a parada selecionada para navegação */
    setNavigationStop: (parada: Parada | null) => void
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Abre o aplicativo de navegação com as coordenadas fornecidas
 * 
 * @param location - Dados de localização
 * @param app - Aplicativo de navegação a ser usado
 * @returns true se conseguiu abrir, false caso contrário
 */
async function openNavigationApp(
    location: NavigationLocation,
    app: NavigationApp
): Promise<boolean> {
    const { latitude, longitude, name } = location
    const latLng = `${latitude},${longitude}`
    let url: string | null = null

    switch (app) {
        case 'waze':
            url = `waze://?ll=${latLng}&navigate=yes`
            // Fallback para web se o app não estiver instalado
            if (!(await Linking.canOpenURL(url))) {
                url = `https://waze.com/ul?ll=${latLng}&navigate=yes`
            }
            break

        case 'googleMaps':
            url = Platform.OS === 'ios'
                ? `comgooglemaps://?q=${latLng}`
                : `https://www.google.com/maps/search/?api=1&query=${latLng}`
            break

        case 'appleMaps':
            const label = name ? `(${name})` : ''
            url = `maps://?q=${latLng}${label}`
            break
    }

    if (url) {
        try {
            await Linking.openURL(url)
            return true
        } catch (error) {
            console.error('[useRouteActions] Erro ao abrir navegação:', error)
            return false
        }
    }

    return false
}

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook para ações na rota
 * 
 * @param rotaId - ID da rota
 * @param options - Opções de configuração do hook
 * @returns Objeto com ações e estados de loading
 * 
 * @example
 * ```tsx
 * const { 
 *   startRoute, 
 *   completeRoute, 
 *   openNavigation,
 *   isStarting,
 *   isCompleting,
 *   popupConcluirRota,
 *   setPopupConcluirRota
 * } = useRouteActions('rota-123', {
 *   onRouteCompleted: () => router.back()
 * })
 * 
 * // Iniciar rota
 * <Button title="Iniciar" onPress={startRoute} loading={isStarting} />
 * 
 * // Abrir modal de conclusão
 * <Button title="Concluir" onPress={() => setPopupConcluirRota(true)} />
 * ```
 */
export function useRouteActions(
    rotaId: Id,
    options: UseRouteActionsOptions = {}
): UseRouteActionsResult {
    const {
        onRouteStarted,
        onRouteCompleted,
        onStartError,
        onCompleteError,
    } = options
    const { showToast } = useToastService();

    // ========================================
    // ESTADOS DE UI
    // ========================================

    const [popupConcluirRota, setPopupConcluirRota] = useState(false)
    const [navigationPopup, setNavigationPopup] = useState(false)
    const [navigationStop, setNavigationStop] = useState<Parada | null>(null)

    // ========================================
    // MUTATIONS
    // ========================================

    // Mutation para iniciar rota
    const {
        isLoading: isStarting,
        startRouting,
    } = useStartRouting({
        onSuccess: () => {
            onRouteStarted?.()
        },
        onError: (error) => {
            console.error('[useRouteActions] Erro ao iniciar rota:', error)
            showToast({ message: 'Não foi possível iniciar a rota. Tente novamente.', type: 'error' })
            onStartError?.(error)
        },
    })

    // Mutation para concluir rota
    const {
        isLoading: isCompleting,
        completeRouting,
    } = useCompleteRouting({
        onSuccess: () => {
            setPopupConcluirRota(false)
            onRouteCompleted?.()
        },
        onError: (error) => {
            console.error('[useRouteActions] Erro ao concluir rota:', error)
            showToast({ message: 'Não foi possível concluir a rota. Tente novamente.', type: 'error' })
            onCompleteError?.(error)
        },
    })

    // ========================================
    // AÇÕES
    // ========================================

    /**
     * Inicia a rota
     */
    const startRoute = useCallback(() => {
        if (!rotaId) {
            console.error('[useRouteActions] rotaId não fornecido')
            return
        }
        startRouting(rotaId)
    }, [rotaId, startRouting])

    /**
     * Conclui a rota
     */
    const completeRoute = useCallback(() => {
        if (!rotaId) {
            console.error('[useRouteActions] rotaId não fornecido')
            return
        }
        completeRouting(rotaId)
    }, [rotaId, completeRouting])

    /**
     * Abre navegação para uma parada
     * Mostra o popup de seleção de app de navegação
     */
    const openNavigation = useCallback((parada: Parada) => {
        setNavigationStop(parada)
        setNavigationPopup(true)
    }, [])

    /**
     * Abre navegação com coordenadas específicas
     * Pode ser usado diretamente sem mostrar o popup
     */
    const openNavigationWithCoords = useCallback(
        async (location: NavigationLocation, app: NavigationApp = 'googleMaps'): Promise<boolean> => {
            return openNavigationApp(location, app)
        },
        []
    )

    // ========================================
    // RETORNO
    // ========================================

    return {
        // Ações
        startRoute,
        completeRoute,
        openNavigation,
        openNavigationWithCoords,

        // Estados de loading
        isStarting,
        isCompleting,
        isLoading: isStarting || isCompleting,

        // Estados de UI
        popupConcluirRota,
        setPopupConcluirRota,
        navigationPopup,
        setNavigationPopup,
        navigationStop,
        setNavigationStop,
    }
}
