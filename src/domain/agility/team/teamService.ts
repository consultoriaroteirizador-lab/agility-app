import { BaseResponse } from '@/api'

import type { MyRosterResponse } from './dto'
import { teamAPI } from './teamAPI'

async function getMyRoster(date?: string): Promise<BaseResponse<MyRosterResponse>> {
    return teamAPI.getMyRoster(date)
}

export const teamService = {
    getMyRoster,
}
