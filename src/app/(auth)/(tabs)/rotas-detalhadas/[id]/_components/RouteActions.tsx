/**
 * RouteActions - Botões de ação da rota
 *
 * Exibe botões de ação como "Iniciar Rota" e "Concluir Rota"
 * baseado no status atual da rota.
 *
 * @module rotas-detalhadas/components
 */

import { Box, Button } from '@/components'
import { measure } from '@/theme'

import { useRota } from '../_context/RotaContext'

// ============================================
// TIPOS
// ============================================

/**
 * Props do componente RouteActions
 */
export interface RouteActionsProps {
    /** Estilo do container */
    style?: object
}

// ============================================
// COMPONENTE
// ============================================

/**
 * Componente de ações da rota
 *
 * Exibe botões de ação baseados no status atual:
 * - Se pendente: Botão "Iniciar Rota"
 * - Se em andamento e sem paradas pendentes: Botão "Concluir Rota"
 *
 * @param props - Props do componente
 * @returns Componente React das ações
 *
 * @example
 * ```tsx
 * function RotaScreen() {
 *   return (
 *     <RotaProvider routeId="123">
 *       <RouteHeader />
 *       <RouteProgress />
 *       <ParadasList />
 *       <RouteActions />
 *     </RotaProvider>
 *   )
 * }
 * ```
 */
export function RouteActions({ style }: RouteActionsProps) {
    const {
        routing,
        nenhumAndamento,
        isStarting,
        isCompleting,
        iniciarRota,
        setPopupConcluirRota,
    } = useRota()

    const isRoutingCompleted = routing?.isCompleted === true
    const isRoutingCancelled = routing?.isCancelled === true
    const isRoutingInProgress = routing?.isInProgress === true
    const isRoutingAssigned = routing?.isAssigned === true

    if (isRoutingCompleted || isRoutingCancelled) {
        return null
    }

    if (isRoutingAssigned && !isRoutingInProgress) {
        return (
            <Box marginTop="y16" style={style}>
                <Button
                    title={isStarting ? 'Iniciando...' : 'Iniciar Rota'}
                    onPress={iniciarRota}
                    disabled={isStarting}
                />
            </Box>
        )
    }

    if (nenhumAndamento) {
        return (
            <Box marginTop="y16" style={style}>
                <Button
                    title={isCompleting ? 'Concluindo...' : 'Concluir Rota'}
                    onPress={() => setPopupConcluirRota(true)}
                    disabled={isCompleting}
                />
            </Box>
        )
    }

    return null
}

// ============================================
// COMPONENTE DE AÇÕES COMPLETO
// ============================================

/**
 * Props do componente RouteActionsFull
 */
export interface RouteActionsFullProps {
    /** Estilo do container */
    style?: object
}

/**
 * Componente de ações completo com todos os botões
 *
 * Inclui:
 * - Botão de iniciar rota
 * - Botão de concluir rota
 * - Botão de cancelar (opcional)
 *
 * @param props - Props do componente
 * @returns Componente React das ações completas
 */
export function RouteActionsFull({ style }: RouteActionsFullProps) {
    const {
        routing,
        nenhumAndamento,
        isStarting,
        isCompleting,
        iniciarRota,
        setPopupConcluirRota,
    } = useRota()

    const isRoutingCompleted = routing?.isCompleted === true
    const isRoutingCancelled = routing?.isCancelled === true
    const isRoutingInProgress = routing?.isInProgress === true
    const isRoutingAssigned = routing?.isAssigned === true

    if (isRoutingCompleted || isRoutingCancelled) {
        return null
    }

    return (
        <Box
            marginTop="y16"
            gap="y12"
            style={style}
        >
            {isRoutingAssigned && !isRoutingInProgress && (
                <Button
                    title={isStarting ? 'Iniciando...' : 'Iniciar Rota'}
                    onPress={iniciarRota}
                    disabled={isStarting}
                    width={measure.x330}

                />
            )}

            {nenhumAndamento && (
                <Button
                    title={isCompleting ? 'Concluindo...' : 'Concluir Rota'}
                    onPress={() => setPopupConcluirRota(true)}
                    disabled={isCompleting}
                    width={measure.x330}
                />
            )}

            {isRoutingInProgress && !nenhumAndamento && (
                <Box
                    backgroundColor="primary10"
                    paddingVertical="y12"
                    paddingHorizontal="x16"
                    borderRadius="s12"
                >
                    <Button
                        title="Ainda há paradas pendentes"
                        onPress={() => { }}
                        disabled
                        preset="outline"
                        width={measure.x330}
                    />
                </Box>
            )}
        </Box>
    )
}
