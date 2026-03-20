import { BaseResponse, MutationOptions, useMutationService } from '@/api'

import type { OptimizeRoutingRequest, OptimizationResultResponse } from '../dto'
import { optimizationService } from '../optimizationService'

export function useOptimizeRouting(options?: MutationOptions<BaseResponse<OptimizationResultResponse>>) {
    const mutation = useMutationService<OptimizationResultResponse, OptimizeRoutingRequest>({
        action: (request: OptimizeRoutingRequest) => optimizationService.optimize(request),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        optimizeRouting: (variables: OptimizeRoutingRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



