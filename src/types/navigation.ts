/**
 * Tipos de navegação para a aplicação Expo Router
 * 
 * Este arquivo define as rotas tipadas para eliminar o uso de `as any` na navegação.
 */

// Rotas estáticas do menu
type MenuRoutes =
    | '/(auth)/(tabs)/menu/historico'
    | '/(auth)/(tabs)/menu/ganhos'
    | '/(auth)/(tabs)/menu/suporte'
    | '/(auth)/(tabs)/menu/protocolos'
    | '/(auth)/(tabs)/menu/jornada'
    | '/(auth)/(tabs)/menu/perfil'
    | '/(auth)/(tabs)/menu/chat'
    | '/(auth)/menu/termos'
    | '/(auth)/menu/privacidade';

// Rotas estáticas de tabs
type TabRoutes =
    | '/(auth)/(tabs)/notificacoes'
    | '/(auth)/(tabs)/rotas'
    | '/(auth)/(tabs)';

// Rotas estáticas relativas (sem prefixo completo)
type RelativeRoutes =
    | '/menu/historico'
    | '/menu/ganhos'
    | '/ofertas';

// Rotas públicas
type PublicRoutes =
    | '/(public)/LoginScreen'
    | '/(public)/(forgotPassword)/ForgotPasswordScreen'
    | '/(public)/UpdateVersionScreen';

/**
 * Tipo que representa todas as rotas estáticas da aplicação.
 * 
 * Combina rotas estáticas para fornecer tipagem completa
 * na navegação usando expo-router.
 * 
 * @example
 * ```typescript
 * import { AppRoutes } from '@/types/navigation';
 * 
 * function navigate(route: AppRoutes) {
 *   router.push(route);
 * }
 * ```
 */
export type AppRoutes =
    | MenuRoutes
    | TabRoutes
    | RelativeRoutes
    | PublicRoutes;

/**
 * Tipo para rotas que podem conter parâmetros dinâmicos.
 * 
 * Use este tipo quando a rota for construída dinamicamente com IDs.
 * O tipo usa template literal types para garantir que a estrutura da rota esteja correta.
 * 
 * @example
 * ```typescript
 * const route: DynamicAppRoute = `/rotas-detalhadas/${id}`;
 * router.push(route as Href);
 * ```
 */
export type DynamicAppRoute =
    | `/rotas-detalhadas/${string}`
    | `/ofertas/${string}`
    | `/menu/historico/${string}`
    | `/menu/protocolos/${string}`
    | `/menu/suporte/${string}`
    | `/rotas-detalhadas/${string}/parada/${string}`
    | `/rotas-detalhadas/${string}/parada/${string}/dados-entrega`
    | `/rotas-detalhadas/${string}/parada/${string}/dados-servico`
    | `/rotas-detalhadas/${string}/parada/${string}/entrega`
    | `/rotas-detalhadas/${string}/parada/${string}/insucesso`
    | `/rotas-detalhadas/${string}/parada/${string}/nao-realizado`
    | RelativeRoutes;

/**
 * Função utilitária para criar rotas tipadas com parâmetros.
 * 
 * @example
 * ```typescript
 * const route = createRoute('/rotas-detalhadas', routeId);
 * router.push(route as Href);
 * ```
 */
export function createRoute(base: string, id: string | number): string {
    return `${base}/${id}`;
}

/**
 * Função utilitária para criar rotas de parada.
 * 
 * @example
 * ```typescript
 * const route = createParadaRoute(routeId, paradaId);
 * router.push(route as Href);
 * ```
 */
export function createParadaRoute(routeId: string | number, paradaId: string | number): string {
    return `/rotas-detalhadas/${routeId}/parada/${paradaId}`;
}

// Re-export Href from expo-router for convenience
export type { Href } from 'expo-router';
