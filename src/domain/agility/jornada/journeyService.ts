import { BaseResponse } from '@/api'
import type { Id } from '@/types/base'

import { journeyAPI } from './journeyAPI'
import type { UpdateJornadaRequest, JornadaResponse } from './types'

async function getMyJourney(driverId: Id): Promise<BaseResponse<JornadaResponse | null>> {
    return journeyAPI.getMyJourney(driverId)
}

async function updateMyJourney(driverId: Id, payload: UpdateJornadaRequest): Promise<BaseResponse<JornadaResponse>> {
    return journeyAPI.updateMyJourney(driverId, payload)
}

/**
 * Atualiza a jornada usando o endpoint de Collaborator
 * Permite atualizar campos adicionais como specificWorkHours e daysOff
 */
async function updateMyWorkSchedule(payload: UpdateJornadaRequest): Promise<BaseResponse<JornadaResponse>> {
    return journeyAPI.updateMyWorkSchedule(payload)
}

export const journeyService = {
    getMyJourney,
    updateMyJourney,
    updateMyWorkSchedule,
}