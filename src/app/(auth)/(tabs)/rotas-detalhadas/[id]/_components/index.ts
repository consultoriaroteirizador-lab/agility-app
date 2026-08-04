/**
 * Barrel export para componentes visuais da tela de detalhes da rota
 *
 * Este arquivo exporta todos os componentes visuais criados para
 * a funcionalidade de detalhes da rota.
 *
 * @module rotas-detalhadas/components
 */

// ============================================
// COMPONENTES DE HEADER
// ============================================

export { RouteHeader } from './RouteHeader'

// ============================================
// COMPONENTES DE PROGRESSO
// ============================================

export { RouteProgress } from './RouteProgress'

// ============================================
// COMPONENTES DE AJUDANTES
// ============================================

export { AjudantesDaRota } from './AjudantesDaRota'

// ============================================
// COMPONENTES DE PARADAS
// ============================================

export {
    ParadaListItem,
    EmptyParadasList,
} from './ParadaListItem'

export type {
    ParadaListItemProps,
    EmptyParadasListProps,
} from './ParadaListItem'

export { InsucessoRowItem } from './InsucessoRowItem'
export type { InsucessoRowItemProps } from './InsucessoRowItem'

// ============================================
// COMPONENTES DE AÇÕES
// ============================================

export {
    RouteActions,
    RouteActionsFull,
} from './RouteActions'

export type {
    RouteActionsProps,
    RouteActionsFullProps,
} from './RouteActions'
