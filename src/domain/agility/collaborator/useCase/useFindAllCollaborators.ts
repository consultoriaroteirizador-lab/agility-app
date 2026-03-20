import { useQuery } from '@tanstack/react-query'

import { KEY_COLLABORATORS } from '@/domain/queryKeys'

import { collaboratorService } from '../collaboratorService'
import type { ListCollaboratorsRequest } from '../dto'

export function useFindAllCollaborators(params?: ListCollaboratorsRequest) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_COLLABORATORS, params?.role, params?.department, params?.page, params?.limit],
        queryFn: () => collaboratorService.findAll(params || {}),
        retry: false,
    })

    return {
        collaborators: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

