/**
 * Barrel export para hooks de rotas detalhadas
 * 
 * Este arquivo exporta todos os hooks customizados
 * para facilitar importações.
 * 
 * @module rotas-detalhadas/hooks
 */

// ============================================
// USE ROUTE DETAILS
// ============================================

export {
    // Hook
    useRouteDetails,
    
    // Tipos
    type UseRouteDetailsResult,
} from './useRouteDetails'

// ============================================
// USE ROUTE ACTIONS
// ============================================

export {
    // Hook
    useRouteActions,
    
    // Tipos
    type UseRouteActionsOptions,
    type UseRouteActionsResult,
    type NavigationApp,
    type NavigationLocation,
} from './useRouteActions'

// ============================================
// USE PARADA NAVIGATION
// ============================================

export {
    // Hook
    useParadaNavigation,
    
    // Tipos
    type UseParadaNavigationResult,
} from './useParadaNavigation'
