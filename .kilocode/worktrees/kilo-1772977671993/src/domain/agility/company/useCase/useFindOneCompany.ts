import { useQuery } from '@tanstack/react-query'

import { KEY_COMPANIES } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { companyService } from '../companyService'

export function useFindOneCompany(id: Id | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_COMPANIES, id],
        queryFn: () => companyService.findOne(id!),
        enabled: !!id,
        retry: false,
    })

    return {
        company: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

