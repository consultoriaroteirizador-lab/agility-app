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
