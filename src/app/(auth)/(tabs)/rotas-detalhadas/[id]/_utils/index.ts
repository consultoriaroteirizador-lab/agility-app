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
    getParadaStatusGrupo,
    getParadaStatusLabel,
    getParadaStatusColor,
    getRotaStatus,
    mapGrupoToParada,
    mapServiceToParada,
    pathForServiceType,
    type StopServiceRoutePath,

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
    resolvePedidosDaParada,

    // Funções de cálculo de progresso
    calculateProgress,
    calculateProgressFromParadas,
    
    // Funções de contagem
    collectLiveServiceIds,
    countParadasByStatus,
    withLedgerNonDelivered,

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

// ============================================
// NÃO-ENTREGUES (LEDGER)
// ============================================

export {
    type InsucessoRow,
    buildInsucessoList,
    countLedgerOnly,
    outcomeLabel,
} from './routeNonDelivered'

// ============================================
// AGRUPAMENTO DE PARADAS (Camada 2)
// ============================================

export {
    type MapPointKeyInput,
    type StopKeyInput,
    contarChavesRepetidas,
    findGrupoDoServico,
    groupContiguousBy,
    groupContiguousStops,
    mapPointStopKeyOf,
    stopKeyOf,
} from './stopGrouping'

// ============================================
// EXIBIÇÃO DA PARADA (selo de notas / progresso)
// ============================================

export {
    type NotaFiscalInput,
    type NotasBadge,
    type NotasBadgeInput,
    formatNotasLabel,
    formatResumoDaNota,
    resolveNotaFiscalLabel,
    resolveNotasBadge,
    resolveParadaAtendida,
    resolveProgressoTexto,
} from './paradaDisplay'
