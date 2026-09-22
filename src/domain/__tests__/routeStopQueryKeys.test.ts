/**
 * Regressão: "Cheguei no retorno" travado depois de concluir todas as paradas.
 *
 * A trava do retorno (`othersDone`, em parada/[pid]/retorno) lê os status das
 * paradas do `/map-data` — chave `['routings', 'map-data', rotaId]`. Os fluxos
 * que MUDAM esse status (conclusão de parada e insucesso) invalidavam só
 * `['routings', rotaId]` e `['services', 'routing', rotaId]`.
 *
 * `['routings', rotaId]` NÃO casa com `['routings', 'map-data', rotaId]`: o
 * react-query casa por PREFIXO POSICIONAL, e o índice 1 diverge
 * ('map-data' ≠ rotaId). Com `staleTime` de 5min (src/app/_layout.tsx) e sem
 * refetch-on-focus, o retorno avaliava a trava contra o snapshot tirado ANTES
 * das paradas terminarem → botão morto, enquanto a lista de paradas (que lê
 * `/services`, esse sim invalidado) já mostrava tudo concluído.
 *
 * Estes testes provam o mecanismo em cima do cache real do react-query.
 */

import { QueryClient } from '@tanstack/react-query'

import { KEY_ROUTINGS, KEY_SERVICES, routeStopChangedKeys } from '../queryKeys'

const ROTA_ID = 'rota-1'
const SERVICE_ID = 'servico-1'

/** Cache com o `/map-data` da rota já populado (o snapshot que trava o retorno). */
function seedMapDataCache() {
    const queryClient = new QueryClient()
    queryClient.setQueryData([KEY_ROUTINGS, 'map-data', ROTA_ID], { services: [] })
    return queryClient
}

const isMapDataStale = (queryClient: QueryClient) =>
    queryClient.getQueryState([KEY_ROUTINGS, 'map-data', ROTA_ID])?.isInvalidated === true

describe('invalidação após mudança de status de parada', () => {
    it('reproduz o bug: invalidar [routings, rotaId] NÃO atinge o /map-data', () => {
        const queryClient = seedMapDataCache()

        void queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, ROTA_ID] })

        expect(isMapDataStale(queryClient)).toBe(false)
    })

    it('invalida o /map-data da rota (trava do "Cheguei no retorno")', () => {
        const queryClient = seedMapDataCache()

        for (const queryKey of routeStopChangedKeys(ROTA_ID, SERVICE_ID)) {
            void queryClient.invalidateQueries({ queryKey })
        }

        expect(isMapDataStale(queryClient)).toBe(true)
    })

    it('mantém as invalidações que a lista de paradas já dependia', () => {
        const queryClient = new QueryClient()
        queryClient.setQueryData([KEY_SERVICES, 'routing', ROTA_ID], [])
        queryClient.setQueryData([KEY_SERVICES, SERVICE_ID], {})
        queryClient.setQueryData([KEY_ROUTINGS, ROTA_ID], {})

        for (const queryKey of routeStopChangedKeys(ROTA_ID, SERVICE_ID)) {
            void queryClient.invalidateQueries({ queryKey })
        }

        expect(queryClient.getQueryState([KEY_SERVICES, 'routing', ROTA_ID])?.isInvalidated).toBe(true)
        expect(queryClient.getQueryState([KEY_SERVICES, SERVICE_ID])?.isInvalidated).toBe(true)
        expect(queryClient.getQueryState([KEY_ROUTINGS, ROTA_ID])?.isInvalidated).toBe(true)
    })

    it('sem serviceId (sync ao vivo), invalida só o que é da rota', () => {
        const queryClient = seedMapDataCache()

        const keys = routeStopChangedKeys(ROTA_ID)

        expect(keys).not.toContainEqual([KEY_SERVICES, undefined])
        for (const queryKey of keys) {
            void queryClient.invalidateQueries({ queryKey })
        }
        expect(isMapDataStale(queryClient)).toBe(true)
    })
})

/**
 * Mesma família do bug acima, com outra consequência.
 *
 * O cancelamento de um pedido com a carga já na rua chega ao app como
 * `service_updated` e passa por `routeStopChangedKeys`. Ele tira a parada da
 * lista (invalidando `/services`) e, no mesmo instante, cria a obrigação de
 * devolver — que vive em `['routings','pending-returns',rotaId]` (o card
 * "Devolver ao CD") e em `['routings','non-delivered',rotaId]` (a linha
 * "Cancelado" do concluídas).
 *
 * Nenhuma das duas casa com `['routings', rotaId]`: o índice 1 diverge. Sem
 * elas no conjunto, a parada some da tela e NADA aparece no lugar até o
 * motorista sair e voltar — que é exatamente o sintoma que o card existe para
 * resolver.
 */
describe('cancelamento em rota: o que substitui a parada que sumiu', () => {
    const chavesDaDevolucao = [
        [KEY_ROUTINGS, 'pending-returns', ROTA_ID],
        [KEY_ROUTINGS, 'non-delivered', ROTA_ID],
    ]

    function seedDevolucaoCache() {
        const queryClient = new QueryClient()
        for (const chave of chavesDaDevolucao) queryClient.setQueryData(chave, [])
        return queryClient
    }

    it('invalidar [routings, rotaId] NÃO atinge as listas de devolução', () => {
        const queryClient = seedDevolucaoCache()

        void queryClient.invalidateQueries({ queryKey: [KEY_ROUTINGS, ROTA_ID] })

        for (const chave of chavesDaDevolucao) {
            expect(queryClient.getQueryState(chave)?.isInvalidated).toBe(false)
        }
    })

    it('routeStopChangedKeys invalida as duas', () => {
        const queryClient = seedDevolucaoCache()

        for (const queryKey of routeStopChangedKeys(ROTA_ID)) {
            void queryClient.invalidateQueries({ queryKey })
        }

        for (const chave of chavesDaDevolucao) {
            expect(queryClient.getQueryState(chave)?.isInvalidated).toBe(true)
        }
    })
})
