/**
 * Barrel export para utilitários de rotas detalhadas
 * 
 * Este arquivo exporta todas as funções utilitárias
 * para facilitar importações.
 * 
 * @module rotas-detalhadas/utils
 */

// ============================================
// STATUS MAPPERS
// ============================================

export {
    // Constantes
    PARADA_STATUS_COLORS,
    PARADA_STATUS_LABELS,
    SERVICE_TYPE_LABELS,
    
    // Funções de mapeamento
    getServiceTypeLabel,
    getParadaStatus,
    getParadaStatusLabel,
    getParadaStatusColor,
    getRotaStatus,
    mapServiceToParada,
    
    // Funções de verificação
    isParadaAtiva,
    isParadaConcluida,
} from './statusMappers'

// ============================================
// ROUTE CALCULATIONS
// ============================================

export {
    // Tipos
    type ParadaCountResult,
    
    // Funções de ordenação
    getParadasOrdenadas,
    
    // Funções de mapeamento
    mapServicesToParadas,
    
    // Funções de cálculo de progresso
    calculateProgress,
    calculateProgressFromParadas,
    
    // Funções de contagem
    countParadasByStatus,
    
    // Funções de filtragem
    filterParadasByStatus,
    filterParadasByStatuses,
    filterParadasByTab,
    
    // Funções de busca
    findOutrasParadas,
    findParadasConcluidas,
    findParadasConcluidasInsucesso,
    findParadasConcluidasSucesso,
    findProximaParada,
    
    // Funções de validação
    hasMultipleParadasEmAndamento,
    isNenhumAndamento,
    isRotaConcluida,
} from './routeCalculations'
