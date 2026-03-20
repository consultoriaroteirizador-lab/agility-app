import { useQuery } from '@tanstack/react-query'

import { KEY_COLLABORATORS } from '@/domain/queryKeys'

import { collaboratorService } from '../collaboratorService'

export function useGetProfile() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_COLLABORATORS, 'profile'],
        queryFn: () => collaboratorService.getProfile(),
        retry: false,
    })

    return {
        profile: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}
