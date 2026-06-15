/**
 * Context React para a tela de Detalhes da Rota
 * 
 * Este Context agrega todos os hooks e fornece dados/ações
 * para os componentes filhos da tela de detalhes da rota.
 * 
 * @module rotas-detalhadas/context
 */

import {
    createContext,
    useContext,
    ReactNode,
    useMemo,
    useCallback,
} from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'


import type { RoutingResponse } from '@/domain/agility/routing/dto'
import { RoutingStatus } from '@/domain/agility/routing/dto/types'
import { useFindMyRoutings } from '@/domain/agility/routing/useCase'
import { KEY_ROUTINGS } from '@/domain/queryKeys'
import { useToastService } from '@/services/Toast/useToast'

import {
    useRouteDetails,
    useRouteActions,
    useParadaNavigation,
} from '../_hooks'
import type {
    Parada,
    Rota,
    RotaStatus,
    RotaTabType,
} from '../_types/rota.types'

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

/**
 * Interface do Context da Rota
 * 
 * Define todos os dados e funções disponíveis
 * através do RotaContext para os componentes filhos.
 */
export interface RotaContextType {
    // ========================================
    // Dados da Rota
    // ========================================

    /** ID da rota atual */
    rotaId: string

    /** Dados brutos da rota vindos do backend */
    routing: RoutingResponse | null

    /** Objeto com dados agregados da rota */
    rota: Rota | null

    /** Lista de paradas formatadas */
    paradas: Parada[]

    // ========================================
    // Estados de Loading
    // ========================================

    /** Indica se está carregando dados iniciais */
    loading: boolean

    /** Indica se houve erro na busca */
    error: boolean

    /** Indica se está iniciando a rota */
    isStarting: boolean

    /** Indica se está concluindo a rota */
    isCompleting: boolean

    // ========================================
    // Status e Progresso
    // ========================================

    /** Porcentagem de progresso da rota (0-100) */
    progress: number

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

    /** Paradas concluídas com insucesso */
    paradasConcluidasInsucesso: Parada[]

    // ========================================
    // Estados de UI
    // ========================================

    /** Indica se não há paradas em andamento */
    nenhumAndamento: boolean

    /** Indica se há múltiplas paradas em andamento (aviso) */
    temMultiplasEmAndamento: boolean

    /** Tab ativa atual */
    aba: RotaTabType

    /** Função para alterar a tab ativa */
    setAba: (aba: RotaTabType) => void

    // ========================================
    // Popups
    // ========================================

    /** Indica se o popup de concluir rota está visível */
    popupConcluirRota: boolean

    /** Define a visibilidade do popup de conclusão */
    setPopupConcluirRota: (visible: boolean) => void

    /** Indica se o popup de navegação está visível */
    popupNavegacao: boolean

    /** Define a visibilidade do popup de navegação */
    setPopupNavegacao: (visible: boolean) => void

    /** Parada selecionada para navegação */
    paradaNavegacao: Parada | null

    // ========================================
    // Ações
    // ========================================

    /** Função para recarregar os dados */
    refresh: () => void

    /** Inicia a rota */
    iniciarRota: () => void

    /** Conclui a rota */
    concluirRota: () => void

    /** Abre navegação para uma parada */
    abrirNavegacao: (parada: Parada) => void

    /** Navega para a tela de detalhes de uma parada */
    navegarParaParada: (parada: Parada) => void
}

// ============================================
// CONTEXT
// ============================================

/**
 * Context da Rota
 * 
 * Inicializado com null para detectar uso fora do Provider
 */
const RotaContext = createContext<RotaContextType | null>(null)

// ============================================
// PROVIDER
// ============================================

/**
 * Props do RotaProvider
 */
export interface RotaProviderProps {
    /** Componentes filhos que terão acesso ao Context */
    children: ReactNode

    /** ID da rota a ser gerenciada */
    routeId: string
}

/**
 * Provider da Rota
 * 
 * Agrega todos os hooks e fornece dados/ações para os componentes filhos.
 * 
 * @param props - Props do provider
 * @returns Provider component com os valores do context
 * 
 * @example
 * ```tsx
 * // No componente de tela
 * export default function RotaDetalhesScreen() {
 *   const { id } = useLocalSearchParams<{ id: string }>()
 *   
 *   return (
 *     <RotaProvider routeId={id}>
 *       <RotaHeader />
 *       <RotaContent />
 *       <RotaFooter />
 *     </RotaProvider>
 *   )
 * }
 * ```
 */
export function RotaProvider({ children, routeId }: RotaProviderProps) {
    // ========================================
    // HOOKS
    // ========================================

    const router = useRouter()
    const queryClient = useQueryClient()

    // Hook de detalhes da rota (busca de dados)
    const {
        routing,
        rota,
        paradas,
        loading,
        error,
        progress,
        status,
        contagem,
        refresh,
        proximaParada,
        outrasParadas,
        paradasConcluidasSucesso,
        paradasConcluidasInsucesso,
        nenhumAndamento,
        temMultiplasEmAndamento,
    } = useRouteDetails(routeId)

    // Hook de ações da rota (iniciar, concluir, navegar)
    const {
        startRoute: iniciarRotaBase,
        completeRoute: concluirRota,
        openNavigation: abrirNavegacao,
        isStarting,
        isCompleting,
        popupConcluirRota,
        setPopupConcluirRota,
        navigationPopup,
        setNavigationPopup,
        navigationStop,
    } = useRouteActions(routeId, {
        onRouteCompleted: async () => {
            console.log('[RotaContext] Rota concluída com sucesso')
            // Invalidar queries de rotas para recarregar a lista na tela principal
            await queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS] })
            router.replace('/(auth)/(tabs)')
        },
    })

    // Hook de navegação entre paradas
    const {
        navigateToStop,
    } = useParadaNavigation(routeId)

    const { showToast } = useToastService()

    // Trava: só permite abrir a parada quando a rota está INICIALIZADA (IN_PROGRESS).
    // A tela de paradas pode ser aberta por outros caminhos (notificação, lista de
    // rotas) com a rota ainda ASSIGNED — nesse caso o clique é bloqueado e o motorista
    // é orientado a iniciar a rota (o CTA "Iniciar Rota" aparece via RouteActions).
    const navegarParaParada = useCallback(
        (parada: Parada) => {
            // SÓ permite abrir a parada quando a rota está EM ANDAMENTO (IN_PROGRESS).
            // Qualquer outro status não leva a fluxo nenhum:
            //   - ASSIGNED/pré-start  → orienta a iniciar a rota (toast)
            //   - finalizada (COMPLETED/CANCELLED) → não acontece nada
            if (routing?.isInProgress !== true) {
                if (routing?.isAssigned === true) {
                    showToast({
                        message: 'Inicie a rota para acessar as paradas.',
                        type: 'error',
                    })
                }
                return
            }
            navigateToStop(parada)
        },
        [routing?.isInProgress, routing?.isAssigned, navigateToStop, showToast],
    )

    // Trava de iniciar rota: mesma regra da home — não pode iniciar uma segunda rota
    // enquanto houver OUTRA já em andamento (IN_PROGRESS). Esta tela é acessível por
    // notificação/lista, então o botão "Iniciar Rota" também precisa dessa validação.
    const { routings } = useFindMyRoutings()
    const iniciarRota = useCallback(() => {
        const outraEmAndamento = routings.find(
            (r) => r.id !== routeId && r.status === RoutingStatus.IN_PROGRESS,
        )
        if (outraEmAndamento) {
            showToast({
                message: 'Você já tem uma rota em andamento. Conclua-a antes de iniciar outra.',
                type: 'error',
            })
            return
        }
        iniciarRotaBase()
    }, [routings, routeId, iniciarRotaBase, showToast])

    // ========================================
    // VALOR DO CONTEXT
    // ========================================

    /**
     * Valor memoizado do Context
     * 
     * Inclui todos os dados e ações disponíveis para os componentes filhos
     */
    const value = useMemo<RotaContextType>(() => ({
        // Dados da rota
        rotaId: routeId,
        routing,
        rota,
        paradas,

        // Estados de loading
        loading,
        error,
        isStarting,
        isCompleting,

        // Status e progresso
        progress,
        status,
        contagem: contagem as ParadaCountResult,

        // Paradas derivadas
        proximaParada,
        outrasParadas,
        paradasConcluidasSucesso,
        paradasConcluidasInsucesso,

        // Estados de UI
        nenhumAndamento,
        temMultiplasEmAndamento,
        aba: 'andamento' as RotaTabType,
        setAba: () => {},

        // Popups
        popupConcluirRota,
        setPopupConcluirRota,
        popupNavegacao: navigationPopup,
        setPopupNavegacao: setNavigationPopup,
        paradaNavegacao: navigationStop,

        // Ações
        refresh,
        iniciarRota,
        concluirRota,
        abrirNavegacao,
        navegarParaParada,
    }), [
        routeId,
        routing,
        rota,
        paradas,
        loading,
        error,
        isStarting,
        isCompleting,
        progress,
        status,
        contagem,
        proximaParada,
        outrasParadas,
        paradasConcluidasSucesso,
        paradasConcluidasInsucesso,
        nenhumAndamento,
        temMultiplasEmAndamento,
        popupConcluirRota,
        setPopupConcluirRota,
        navigationPopup,
        setNavigationPopup,
        navigationStop,
        refresh,
        iniciarRota,
        concluirRota,
        abrirNavegacao,
        navegarParaParada,
    ])

    return (
        <RotaContext.Provider value={value}>
            {children}
        </RotaContext.Provider>
    )
}

// ============================================
// HOOK DE ACESSO
// ============================================

/**
 * Hook para acessar o Context da Rota
 * 
 * Deve ser usado dentro de um RotaProvider.
 * 
 * @returns Objeto com todos os dados e ações do Context
 * @throws Error se usado fora de um RotaProvider
 * 
 * @example
 * ```tsx
 * function RotaHeader() {
 *   const { rota, progress, status } = useRota()
 *   
 *   return (
 *     <View>
 *       <Text>{rota?.nome}</Text>
 *       <ProgressBar progress={progress} />
 *       <Badge status={status} />
 *     </View>
 *   )
 * }
 * ```
 */
export function useRota(): RotaContextType {
    const context = useContext(RotaContext)

    if (!context) {
        throw new Error(
            'useRota deve ser usado dentro de um RotaProvider. ' +
            'Certifique-se de envolver seu componente com <RotaProvider routeId={id}>'
        )
    }

    return context
}

// ============================================
// EXPORTS
// ============================================

export { RotaContext }
