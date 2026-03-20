import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { MaterialCheckResponse, MaterialCheckRequest } from '../dto/response/service-material.response'
import { serviceService } from '../serviceService'

export function useCheckMaterial(options?: MutationOptions<BaseResponse<MaterialCheckResponse>>) {
    const mutation = useMutationService<MaterialCheckResponse, { serviceId: Id; materialId: Id; data: MaterialCheckRequest }>({
        action: ({ serviceId, materialId, data }) => serviceService.checkMaterial(serviceId, materialId, data),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        checkMaterial: (variables: { serviceId: Id; materialId: Id; data: MaterialCheckRequest }) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}
