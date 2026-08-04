import type { MyRosterResponse } from './dto'
import { teamAPI } from './teamAPI'

async function getMyRoster(date?: string): Promise<MyRosterResponse> {
    return teamAPI.getMyRoster(date)
}

export const teamService = {
    getMyRoster,
}
