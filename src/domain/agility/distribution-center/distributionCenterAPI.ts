import { apiAgility } from '@/api/apiConfig'

import type { DistributionCenterResponse } from './dto'

export interface ListDistributionCentersParams {
    activeOnly?: boolean
    origin?: 'global' | 'branch' | 'all'
    branchId?: string
}

// GET /distribution-centers retorna um ARRAY cru (controller faz list.map(toJson)),
// não o envelope { result }. Por isso tipamos DistributionCenterResponse[] direto.
async function findAll(params: ListDistributionCentersParams = {}): Promise<DistributionCenterResponse[]> {
    const { data } = await apiAgility.get<DistributionCenterResponse[]>('/distribution-centers', {
        params: {
            ...(params.activeOnly != null && { activeOnly: params.activeOnly }),
            ...(params.origin && { origin: params.origin }),
            ...(params.branchId && { branchId: params.branchId }),
        },
    })
    return Array.isArray(data) ? data : ((data as any)?.result ?? [])
}

export const distributionCenterAPI = { findAll }
