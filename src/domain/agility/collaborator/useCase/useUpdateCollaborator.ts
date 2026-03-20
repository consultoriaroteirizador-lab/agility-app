import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { collaboratorService } from '../collaboratorService'
import type { UpdateCollaboratorRequest, CollaboratorResponse } from '../dto'

interface UpdateCollaboratorParams {
    id: Id
    payload: UpdateCollaboratorRequest
}

export function useUpdateCollaborator(options?: MutationOptions<BaseResponse<CollaboratorResponse>>) {
    const mutation = useMutationService<CollaboratorResponse, UpdateCollaboratorParams>({
        action: (request: UpdateCollaboratorParams) => collaboratorService.update(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        updateCollaborator: (variables: UpdateCollaboratorParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

