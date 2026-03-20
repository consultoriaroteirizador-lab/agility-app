import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { customerService } from '../customerService'
import type { CustomerResponse } from '../dto'

export function useDeactivateCustomer(options?: MutationOptions<BaseResponse<CustomerResponse>>) {
    const mutation = useMutationService<CustomerResponse, Id>({
        action: (id: Id) => customerService.deactivate(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        deactivateCustomer: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

