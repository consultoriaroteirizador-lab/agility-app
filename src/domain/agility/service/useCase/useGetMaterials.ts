import { useQuery } from '@tanstack/react-query'
import type { Id } from '@/types/base'

import type { ServiceMaterialResponse } from '../dto/response/service-material.response'
import { serviceService } from '../serviceService'

export function useGetMaterials(serviceId: Id | undefined) {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['serviceMaterials', serviceId],
        queryFn: () => serviceService.getMaterials(serviceId!),
        enabled: !!serviceId,
        retry: false,
    })

    return {
        materials: data?.result ?? [],
        isLoading,
        isError,
        refetch,
    }
}
