import { BaseResponse, MutationOptions, useMutationService } from '@/api'

import { collaboratorService } from '../collaboratorService'
import type { CreateCollaboratorRequest, CollaboratorResponse } from '../dto'

export function useCreateCollaborator(options?: MutationOptions<BaseResponse<CollaboratorResponse>>) {
    const mutation = useMutationService<CollaboratorResponse, CreateCollaboratorRequest>({
        action: (request: CreateCollaboratorRequest) => collaboratorService.create(request),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        createCollaborator: (variables: CreateCollaboratorRequest) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

