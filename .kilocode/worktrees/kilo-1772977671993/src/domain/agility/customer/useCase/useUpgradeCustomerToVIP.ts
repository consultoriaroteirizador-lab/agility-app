import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { customerService } from '../customerService'
import type { CustomerResponse } from '../dto'

export function useUpgradeCustomerToVIP(options?: MutationOptions<BaseResponse<CustomerResponse>>) {
    const mutation = useMutationService<CustomerResponse, Id>({
        action: (id: Id) => customerService.upgradeToVIP(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        upgradeCustomerToVIP: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

