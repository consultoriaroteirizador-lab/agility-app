import { useQuery } from '@tanstack/react-query'

import { KEY_COMPANIES } from '@/domain/queryKeys'

import { companyService } from '../companyService'

export function useFindAllCompanies() {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_COMPANIES],
        queryFn: () => companyService.findAll(),
        retry: false,
    })

    return {
        companies: data?.result ?? [],
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

