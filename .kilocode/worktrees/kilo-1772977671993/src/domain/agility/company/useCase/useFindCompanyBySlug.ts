import { useQuery } from '@tanstack/react-query'

import { KEY_COMPANIES } from '@/domain/queryKeys'

import { companyService } from '../companyService'

export function useFindCompanyBySlug(slug: string | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_COMPANIES, 'slug', slug],
        queryFn: () => companyService.findBySlug(slug!),
        enabled: !!slug,
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

