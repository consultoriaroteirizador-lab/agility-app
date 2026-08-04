import { apiAgility } from '@/api/apiConfig'

import type { MyRosterResponse } from './dto'

/**
 * `GET /teams/roster/me` responde o objeto direto, SEM o envelope
 * `BaseResponse` dos demais endpoints — o TeamController devolve `toJson()`
 * cru, diferente do RoutingController, que passa por `ResponseHelper.success`.
 * Confirmado: o interceptor de resposta do axios (`apiConfig.ts`) só loga e
 * repassa `response.data` sem desembrulhar nada — então `data` aqui já é o
 * `MyRosterResponse` cru, como o backend devolve.
 */
async function getMyRoster(date?: string): Promise<MyRosterResponse> {
    const { data } = await apiAgility.get<MyRosterResponse>('/teams/roster/me', {
        params: date ? { date } : {},
    })
    return data
}

export const teamAPI = {
    getMyRoster,
}
