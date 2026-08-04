export const KEY_ROUTINGS = 'routings'
export const KEY_COLLABORATORS = 'collaborators'
export const KEY_NOTIFICATIONS = 'notifications'
export const KEY_OFFERS = 'offers'
export const KEY_SERVICES = 'services'
export const KEY_ADDRESSES = 'addresses'
export const KEY_CHATS = 'chats'
export const KEY_TICKETS = 'tickets'
export const KEY_FINANCE = 'finance'
export const KEY_JOURNEY = 'journey'
export const KEY_DRIVER = 'driver'
export const KEY_WALLET = 'wallet'
export const KEY_RATING = 'rating'
export const KEY_FORM_GROUPS = 'form-groups'
export const KEY_FORM_GROUP_ANSWERS = 'form-group-answers'
export const KEY_DISTRIBUTION_CENTERS = 'distribution-centers'
export const KEY_OCCURRENCE_REASONS = 'order-occurrence-reasons'
export const KEY_TEAMS = 'teams'

/**
 * Chaves a invalidar quando o STATUS de uma parada muda (conclusão, insucesso,
 * chegada) — o conjunto único usado por todos os fluxos que mexem em parada.
 *
 * Existe por causa de um bug de trava: o `/map-data` (`['routings','map-data',
 * rotaId]`) também carrega o status das paradas — é dele que sai a trava do
 * "Cheguei no retorno" e a cor dos pinos no mapa da rota. Como o react-query
 * casa a chave por PREFIXO POSICIONAL, invalidar `['routings', rotaId]` não o
 * atinge (índice 1: 'map-data' ≠ rotaId). Com `staleTime` de 5min e sem
 * refetch-on-focus (`src/app/_layout.tsx`), ele ficava servindo o snapshot
 * anterior: a lista de paradas (de `/services`) mostrava tudo concluído e o
 * retorno seguia dizendo "Conclua as demais paradas".
 *
 * Invalidar a rota inteira (`[KEY_ROUTINGS]`) resolveria, mas refaz também as
 * listas de rotas/ofertas a cada parada — este conjunto mira só o que mudou.
 */
export function routeStopChangedKeys(rotaId: string, serviceId?: string): unknown[][] {
    return [
        ...(serviceId ? [[KEY_SERVICES, serviceId]] : []),
        [KEY_SERVICES, 'routing', rotaId],
        [KEY_ROUTINGS, rotaId],
        [KEY_ROUTINGS, 'map-data', rotaId],
    ]
}
