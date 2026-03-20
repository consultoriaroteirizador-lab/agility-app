import { useQuery } from '@tanstack/react-query'

import { KEY_SERVICES } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { serviceService } from '../serviceService'

export function useFindOneService(id: Id | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_SERVICES, id],
        queryFn: () => serviceService.findOne(id!),
        enabled: !!id,
        retry: false,
    })

    return {
        service: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}



