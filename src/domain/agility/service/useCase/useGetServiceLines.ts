import { useQuery } from '@tanstack/react-query'

import type { Id } from '@/types/base'

import type { ServiceType } from '../dto/types'
import { lineRoute } from '../serviceLines'
import { serviceService } from '../serviceService'

/** As linhas de um serviço pela rota da família (`lineRoute`). */
export function useGetServiceLines(serviceId: Id | undefined, serviceType: ServiceType | null | undefined) {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['serviceLines', serviceId, lineRoute(serviceType)],
        queryFn: () => serviceService.getLines(serviceId!, serviceType),
        enabled: !!serviceId,
        retry: false,
    })

    return {
        lines: data?.result ?? [],
        isLoading,
        isError,
        refetch,
    }
}
