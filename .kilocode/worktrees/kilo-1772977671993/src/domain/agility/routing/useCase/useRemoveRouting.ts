import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import type { RoutingResponse } from '../dto'
import { routingService } from '../routingService'

export function useRemoveRouting(options?: MutationOptions<BaseResponse<RoutingResponse>>) {
    const mutation = useMutationService<RoutingResponse, Id>({
        action: (id: Id) => routingService.remove(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        removeRouting: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}



