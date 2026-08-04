import { useQuery } from '@tanstack/react-query'

import { KEY_TEAMS } from '@/domain/queryKeys'

import type { TeamRosterMemberResponse } from '../dto'
import { teamService } from '../teamService'

/**
 * A equipe fixa do motorista logado.
 *
 * O backend devolve o roster INCLUINDO a própria pessoa (contrato do P2) — o
 * filtro mora aqui, para que nenhuma tela precise lembrar dele. Compara pelo
 * `personId` do próprio envelope: não é preciso uma segunda chamada para o app
 * descobrir quem ele é.
 */
export function useMyTeamRoster() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_TEAMS, 'roster', 'me'],
        queryFn: () => teamService.getMyRoster(),
        retry: 2,
        staleTime: 5 * 60 * 1000,
    })

    const colegas: TeamRosterMemberResponse[] = (data?.members ?? []).filter(
        (m) => m.collaboratorId !== data?.personId && m.providerId !== data?.personId,
    )

    return {
        colegas,
        temEquipe: (data?.members?.length ?? 0) > 0,
        isLoading,
        isRefetching,
        isError,
        refetch,
    }
}
