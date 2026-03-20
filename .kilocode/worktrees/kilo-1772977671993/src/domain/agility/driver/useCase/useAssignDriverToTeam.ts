import { BaseResponse, MutationOptions, useMutationService } from '@/api'
import type { Id } from '@/types/base'

import { driverService } from '../driverService'
import type { AssignDriverTeamRequest, DriverResponse } from '../dto'

interface AssignDriverToTeamParams {
    id: Id
    payload: AssignDriverTeamRequest
}

export function useAssignDriverToTeam(options?: MutationOptions<BaseResponse<DriverResponse>>) {
    const mutation = useMutationService<DriverResponse, AssignDriverToTeamParams>({
        action: (request: AssignDriverToTeamParams) => driverService.assignToTeam(request.id, request.payload),
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })

    return {
        isLoading: mutation.isLoading,
        assignDriverToTeam: (variables: AssignDriverToTeamParams) => mutation.mutate(variables),
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
    }
}

