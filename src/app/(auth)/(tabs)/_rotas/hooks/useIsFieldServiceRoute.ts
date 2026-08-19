import { useFindOneRouting } from '@/domain/agility/routing/useCase'

import { isFieldServiceRoute } from '../utils/routeKind'

/**
 * "A rota desta tela é de serviço em campo?"
 *
 * Para telas que não têm o `RotaProvider` montado — o retorno, por exemplo — e
 * ainda assim precisam saber o tipo da ROTA para se pintar (`ServiceFlowTheme`).
 * A parada de retorno é `RETURN`, não `SERVICE`: perguntar pela nota daria
 * sempre "não é serviço" e a tela ficaria roxa no meio de uma rota laranja.
 *
 * `useFindOneRouting` é a MESMA query que o `useRouteDetails` usa (mesma chave
 * de react-query), então quem chegou aqui pela lista de paradas lê do cache.
 */
export function useIsFieldServiceRoute(routeId?: string | null): boolean {
    const { routing } = useFindOneRouting(routeId)

    return isFieldServiceRoute(routing)
}
