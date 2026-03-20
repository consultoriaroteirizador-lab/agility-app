import { useQuery } from '@tanstack/react-query'

import { KEY_COMPANIES } from '@/domain/queryKeys'

import { companyService } from '../companyService'

export function useDiscoverCompanyByEmail(email: string | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_COMPANIES, 'discover', email],
        queryFn: () => companyService.discoverByEmail(email!),
        enabled: !!email,
        retry: false,
    })

    return {
        discovery: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

