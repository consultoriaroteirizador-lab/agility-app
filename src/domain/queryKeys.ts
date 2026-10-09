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
export const KEY_FUEL_ENTRIES = 'fuel-entries'

/**
 * Chaves invalidadas a cada push recebido ou tocado (ver `NotificationContext`).
 * Invalidar só refaz as queries com observador ativo, então o custo é baixo.
 *
 * `KEY_WALLET`/`KEY_FINANCE` entraram porque o back manda ROUTE_COMPLETED
 * (`route.completed`) e PAYMENT_RECEIVED (`payment.received`) pelos MESMOS
 * eventos que criam a parcela de frete e a dívida/pagamento em dinheiro
 * (`notification.listener.ts` no back). Sem isso, um push chegando com a
 * tela de carteira/ganhos/cobranças montada em background não refazia o
 * saldo — só a rota/notificação.
 *
 * `KEY_SERVICES` entrou com ROUTE_STOP_RELOCATED (01/10/2026): a central corrige o
 * local de uma parada da rota do motorista, e a tela da parada — de onde sai o link
 * do Waze/Maps — guardava a coordenada antiga por até 5 min. Invalidar só refaz o que
 * está montado, então com a parada fechada o custo é zero.
 */
export const PUSH_INVALIDATED_KEYS: readonly string[] = [
    KEY_ROUTINGS,
    KEY_NOTIFICATIONS,
    KEY_CHATS,
    KEY_TICKETS,
    KEY_WALLET,
    KEY_FINANCE,
    KEY_SERVICES,
]

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
/**
 * Chaves do dinheiro do motorista. Concluir uma parada com cobrança em dinheiro cria a
 * dívida e o pagamento; concluir a rota cria a parcela de frete (F2). Além do push
 * (ROUTE_COMPLETED/PAYMENT_RECEIVED, ver `PUSH_INVALIDATED_KEYS`), quem conclui invalida
 * direto — cobre o caso de app em foreground sem passar pelo listener de notificação.
 * Chamada só nos pontos de conclusão/insucesso (`useServiceCompletion`, `insucesso`,
 * `useCompleteRouting`) — NUNCA dentro de
 * `routeStopChangedKeys`, que também roda a cada `routing_updated`/`service_updated` do
 * `/monitoring` (reprojeção de ETA, sem nenhuma mudança de dinheiro).
 */
export function moneyChangedKeys(): unknown[][] {
    return [[KEY_WALLET], [KEY_FINANCE]]
}

export function routeStopChangedKeys(rotaId: string, serviceId?: string): unknown[][] {
    return [
        ...(serviceId ? [[KEY_SERVICES, serviceId]] : []),
        [KEY_SERVICES, 'routing', rotaId],
        [KEY_ROUTINGS, rotaId],
        [KEY_ROUTINGS, 'map-data', rotaId],
        // As duas listas que respondem "o que aconteceu com a parada que saiu da
        // lista". O cancelamento com a carga na rua tira o pedido da rota e cria
        // a obrigação de devolver no MESMO evento: sem estas chaves a parada
        // some e nada aparece no lugar até o motorista sair e voltar. Elas
        // sofrem do mesmo descasamento posicional do `map-data` acima.
        [KEY_ROUTINGS, 'pending-returns', rotaId],
        [KEY_ROUTINGS, 'non-delivered', rotaId],
        // NÃO inclui `moneyChangedKeys()`: esta função roda a cada `routing_updated`/
        // `service_updated` vindo do `/monitoring` (`useRouteLiveSync`), inclusive na
        // reprojeção de ETA por atraso — que não move dinheiro nenhum. Quem conclui ou
        // marca insucesso chama `moneyChangedKeys()` à parte (ver comentário acima dela).
    ]
}

/**
 * Chaves do live sync da rota aberta (`useRouteLiveSync`: `routing_updated` /
 * `service_updated` do `/monitoring`). É o conjunto de `routeStopChangedKeys` MAIS
 * o prefixo `KEY_SERVICES`, porque o evento não diz qual parada mudou e a tela da
 * parada (`['services', serviceId]`) precisa refazer — é dela que sai o link do
 * Waze/Maps quando a central corrige o local (ROUTE_STOP_RELOCATED, 01/10/2026).
 *
 * Função separada, e não um item a mais em `routeStopChangedKeys`, porque aquela
 * roda nos fluxos de conclusão/insucesso, que sabem a parada exata.
 */
export function routeLiveSyncKeys(rotaId: string): unknown[][] {
    return [...routeStopChangedKeys(rotaId), [KEY_SERVICES]]
}
