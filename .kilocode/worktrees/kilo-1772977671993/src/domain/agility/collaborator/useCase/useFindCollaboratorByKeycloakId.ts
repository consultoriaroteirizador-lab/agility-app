import { useQuery } from '@tanstack/react-query'

import { KEY_COLLABORATORS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { collaboratorService } from '../collaboratorService'

export function useFindCollaboratorByKeycloakId(keycloakUserId: Id | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_COLLABORATORS, 'keycloak', keycloakUserId],
        queryFn: () => collaboratorService.findByKeycloakUserId(keycloakUserId!),
        enabled: !!keycloakUserId,
        retry: false,
    })

    return {
        collaborator: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

