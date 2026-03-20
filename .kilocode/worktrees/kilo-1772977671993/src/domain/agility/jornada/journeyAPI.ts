import { BaseResponse } from '@/api'
import { apiService } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type {
    UpdateJornadaRequest,
    JornadaResponse,
} from './types'

/**
 * Busca a jornada do motorista pelo ID do colaborador
 * O backend retorna os dados do driver que incluem workDays, workStartTime, workEndTime
 */
async function getMyJourney(driverId: Id): Promise<BaseResponse<JornadaResponse | null>> {
    const { data } = await apiService.get<BaseResponse<JornadaResponse | null>>(`/drivers/${driverId}`)
    return data
}

/**
 * Atualiza a jornada do motorista
 * Usa o endpoint PATCH /drivers/:id para atualizar workDays, workStartTime, workEndTime
 */
async function updateMyJourney(driverId: Id, payload: UpdateJornadaRequest): Promise<BaseResponse<JornadaResponse>> {
    const { data } = await apiService.patch<BaseResponse<JornadaResponse>>(`/drivers/${driverId}`, {
        workDays: payload.workDays?.join(',') || undefined,
        workStartTime: payload.workStartTime,
        workEndTime: payload.workEndTime,
    })
    return data
}

export const journeyAPI = {
    getMyJourney,
    updateMyJourney,
}