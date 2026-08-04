import { useQuery } from '@tanstack/react-query'

import { KEY_TEAMS } from '@/domain/queryKeys'

import { filterColegas, hasTeam } from '../rosterFilter'
import { teamService } from '../teamService'

/**
 * A equipe fixa do motorista logado.
 *
 * `teamService.getMyRoster` devolve `BaseResponse<MyRosterResponse>` — o
 * payload real mora em `data.result` (ver docblock de `teamAPI.ts` sobre o
 * `ResponseInterceptor` global do Nest). O filtro do próprio motorista (ele
 * aparece no roster por contrato do backend) mora em `rosterFilter.ts`, como
 * função pura, para que nenhuma tela precise lembrar dele e para poder ser
 * testado sem montar o hook.
 */
export function useMyTeamRoster() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_TEAMS, 'roster', 'me'],
        queryFn: () => teamService.getMyRoster(),
        retry: 2,
        staleTime: 5 * 60 * 1000,
    })

    const roster = data?.result

    return {
        colegas: filterColegas(roster),
        temEquipe: hasTeam(roster),
        isLoading,
        isRefetching,
        isError,
        refetch,
    }
}
