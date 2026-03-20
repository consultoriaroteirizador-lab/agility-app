import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { collaboratorService } from '../collaboratorService'
import type { CollaboratorResponse } from '../dto'

export function useActivateCollaborator(options?: MutationOptions<BaseResponse<CollaboratorResponse>>) {
    const mutation = useMutationService<CollaboratorResponse, Id>({
        action: (id: Id) => collaboratorService.activate(id),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        activateCollaborator: (variables: Id) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

