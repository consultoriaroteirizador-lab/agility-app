import type { BaseResponse } from '@/api'
import { apiService } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type { UpdateJornadaRequest, JornadaResponse, WeekDay } from './types'
import { formatWorkDaysForBackend } from './types'

/**
 * Mapeia dias da semana do formato do app (MON, TUE, ...) para o formato do backend Collaborator (seg, ter, ...)
 */
const mapWeekDayToCollaborator = (day: WeekDay): string => {
    const map: Record<WeekDay, string> = {
        MON: 'seg', TUE: 'ter', WED: 'qua', THU: 'qui',
        FRI: 'sex', SAT: 'sab', SUN: 'dom'
    }
    return map[day]
}

async function getMyJourney(driverId: Id): Promise<BaseResponse<JornadaResponse | null>> {
    const { data } = await apiService.get<BaseResponse<JornadaResponse | null>>(
        `/drivers/${driverId}`
    )

    return data
}

async function updateMyJourney(
    driverId: Id,
    payload: UpdateJornadaRequest
): Promise<BaseResponse<JornadaResponse>> {
    const { data } = await apiService.patch<BaseResponse<JornadaResponse>>(
        `/drivers/${driverId}`,
        {
            workDays: payload.workDays ? formatWorkDaysForBackend(payload.workDays) : undefined,
            workStartTime: payload.workStartTime,
            workEndTime: payload.workEndTime,
        }
    )

    return data
}

/**
 * Atualiza a jornada de trabalho usando o endpoint de Collaborator
 * Este endpoint permite que o próprio colaborador atualize sua jornada
 * Suporta campos adicionais como specificWorkHours, daysOff, breakInterval, restInterval, tipoContrato
 */
async function updateMyWorkSchedule(
    payload: UpdateJornadaRequest
): Promise<BaseResponse<JornadaResponse>> {
    const workSchedule = {
        workDays: payload.workDays?.map(mapWeekDayToCollaborator) ?? [],
        workPeriod: [],
        specificHours: !!payload.specificWorkHours?.length,
        specificWorkHours: payload.specificWorkHours?.map(s => ({
            weekDay: mapWeekDayToCollaborator(s.weekDay),
            hours: s.hours
        })),
        daysOff: payload.daysOff?.map(d => ({
            startDate: d,
            endDate: d,
            title: 'Folga',
            status: 'offline' as const
        })),
        // Novos campos para integração completa
        breakInterval: payload.breakInterval,
        restInterval: payload.restInterval,
        tipoContrato: payload.tipoContrato,
    }

    const { data } = await apiService.patch<BaseResponse<JornadaResponse>>(
        `/collaborators/profile/work-schedule`,
        { workSchedule }
    )

    return data
}

export const journeyAPI = {
    getMyJourney,
    updateMyJourney,
    updateMyWorkSchedule,
}
