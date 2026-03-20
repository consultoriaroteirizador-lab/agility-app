/**
 * Tipos TypeScript para a tela de Detalhes da Rota
 * 
 * Este arquivo contém todas as interfaces e tipos utilizados
 * na funcionalidade de visualização e gerenciamento de rotas.
 * 
 * @module rotas-detalhadas/types
 */

import type { RoutingResponse } from '@/domain/agility/routing/dto'
import type { ServiceResponse } from '@/domain/agility/service/dto'

// ============================================
// STATUS TYPES
// ============================================

/**
 * Status possíveis de uma parada
 * 
 * - pendente: Parada ainda não iniciada
 * - em-andamento: Parada em execução
 * - concluida-sucesso: Parada finalizada com sucesso
 * - concluida-insucesso: Parada finalizada com falha/cancelamento
 */
export type ParadaStatus =
    | 'pendente'
    | 'em-andamento'
    | 'concluida-sucesso'
    | 'concluida-insucesso'

/**
 * Status possíveis de uma rota
 * 
 * - pendente: Rota aguardando início
 * - em-andamento: Rota em execução
 * - concluida: Rota finalizada
 * - cancelada: Rota cancelada
 */
export type RotaStatus =
    | 'pendente'
    | 'em-andamento'
    | 'concluida'
    | 'cancelada'

// ============================================
// UI TYPES
// ============================================

/**
 * Tipo de tab ativa na tela de detalhes da rota
 */
export type RotaTabType = 'andamento' | 'concluido'

/**
 * Parâmetros da rota de detalhes
 */
export interface RotaScreenParams {
    /** ID da rota */
    id: string
}

// ============================================
// DOMAIN TYPES
// ============================================

/**
 * Interface para parada formatada exibida na UI
 * 
 * Esta interface representa uma parada após transformação
 * dos dados do serviço para exibição na tela.
 */
export interface Parada {
    /** Número sequencial da parada na rota (1-indexed) */
    numero: number

    /** ID do serviço associado à parada */
    serviceId: string

    /** Nome do cliente/local da parada */
    nome: string

    /** Endereço formatado da parada */
    endereco: string

    /** Horário de início previsto (formato HH:MM) */
    horarioInicio: string

    /** Horário de término previsto (formato HH:MM) */
    horarioFim: string

    /** Tipo de serviço (Instalação, Entrega, Manutenção, etc.) */
    tipo: string

    /** Status atual da parada */
    status: ParadaStatus
}

/**
 * Interface para dados agregados da rota
 */
export interface Rota {
    /** ID da rota */
    id: string

    /** Nome da rota */
    nome: string | null

    /** Código da rota */
    codigo: string | null

    /** Status da rota */
    status: RotaStatus

    /** Lista de paradas da rota */
    paradas: Parada[]

    /** Total de paradas */
    totalParadas: number

    /** Quantidade de paradas concluídas */
    paradasConcluidas: number

    /** Quantidade de paradas pendentes */
    paradasPendentes: number

    /** Quantidade de paradas em andamento */
    paradasEmAndamento: number
}

// ============================================
// CONTEXT TYPES
// ============================================

/**
 * Interface para o contexto da rota
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

    /** Lista de serviços da rota */
    services: ServiceResponse[]

    /** Lista de paradas formatadas */
    paradas: Parada[]

    // ========================================
    // Estados de Loading
    // ========================================

    /** Indica se está carregando dados da rota */
    isLoading: boolean

    /** Indica se está carregando serviços */
    isLoadingServices: boolean

    /** Indica se está concluindo a rota */
    isCompletingRota: boolean

    // ========================================
    // Estados de UI
    // ========================================

    /** Tab ativa atual */
    aba: RotaTabType

    /** Função para alterar a tab ativa */
    setAba: (aba: RotaTabType) => void

    /** Indica se o popup de concluir rota está visível */
    popupConcluirRota: boolean

    /** Função para abrir o popup de concluir rota */
    setPopupConcluirRota: (visible: boolean) => void

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

    /** Indica se não há paradas em andamento */
    nenhumAndamento: boolean

    // ========================================
    // Ações
    // ========================================

    /** Função para concluir a rota */
    concluirRota: () => void

    /** Função para navegar para uma parada */
    navegarParaParada: (parada: Parada) => void
}

// ============================================
// PROPS TYPES
// ============================================

/**
 * Props para o componente RotaHeader
 */
export interface RotaHeaderProps {
    /** Nome da rota */
    nomeRota: string

    /** Número da próxima parada */
    proximaParadaNumero?: number

    /** Total de paradas */
    totalParadas: number

    /** Callback ao pressionar botão voltar */
    onVoltar: () => void
}

/**
 * Props para o componente RotaTabs
 */
export interface RotaTabsProps {
    /** Tab ativa atual */
    aba: RotaTabType

    /** Callback para alterar a tab */
    onTabChange: (aba: RotaTabType) => void
}

/**
 * Props para o componente ParadaCardList
 */
export interface ParadaCardListProps {
    /** Lista de paradas a serem exibidas */
    paradas: Parada[]

    /** Título da seção */
    titulo: string

    /** Indica se é a próxima parada (destaque visual) */
    isProximaParada?: boolean

    /** Callback ao pressionar uma parada */
    onPressParada: (parada: Parada) => void
}

/**
 * Props para o componente ParadaConcluidaCard
 */
export interface ParadaConcluidaCardProps {
    /** Parada concluída */
    parada: Parada

    /** Indica se foi concluída com insucesso */
    isInsucesso?: boolean
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Mapa de tipos de serviço para labels em português
 */
export type ServiceTypeLabelMap = {
    [key: string]: string
}

/**
 * Resultado do mapeamento de serviço para parada
 */
export interface MapServiceToParadaResult extends Parada { }

/**
 * Filtros para lista de paradas
 */
export interface ParadaFilters {
    /** Filtrar por status */
    status?: ParadaStatus | ParadaStatus[]

    /** Filtrar por tipo de serviço */
    tipo?: string

    /** Filtrar por texto (nome ou endereço) */
    texto?: string
}
