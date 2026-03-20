import { BaseResponse, QueryOptions, useQueryService } from '@/api'
import type { Id } from '@/types/base'

import type { ServiceMaterialResponse } from '../dto/response/service-material.response'
import { serviceService } from '../serviceService'

export function useGetMaterials(serviceId: Id | undefined, options?: QueryOptions<BaseResponse<ServiceMaterialResponse[]>>) {
    const { data, isLoading, isError, refetch } = useQueryService<ServiceMaterialResponse[]>(
        ['serviceMaterials', serviceId],
        () => serviceService.getMaterials(serviceId!),
        {
            enabled: !!serviceId,
            ...options,
        }
    )

    return {
        materials: data?.result ?? [],
        isLoading,
        isError,
        refetch,
    }
}
