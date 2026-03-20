import { useQuery } from '@tanstack/react-query'

import { KEY_COLLABORATORS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { collaboratorService } from '../collaboratorService'

export function useFindOneCollaborator(id: Id | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_COLLABORATORS, id],
        queryFn: () => collaboratorService.findOne(id!),
        enabled: !!id,
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

