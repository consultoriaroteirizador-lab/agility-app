import { BaseResponse, MutationOptions, useMutationService } from '@/api'

import { collaboratorService } from '../collaboratorService'
import type { UpdateCollaboratorRequest, CollaboratorResponse } from '../dto'

export function useUpdateProfile(options?: MutationOptions<BaseResponse<CollaboratorResponse>>) {
    const mutation = useMutationService<CollaboratorResponse, UpdateCollaboratorRequest>({
        action: (payload: UpdateCollaboratorRequest) => collaboratorService.updateProfile(payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        updateProfile: (payload: UpdateCollaboratorRequest) => mutation.mutate(payload),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}