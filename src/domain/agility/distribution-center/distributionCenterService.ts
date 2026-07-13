import { distributionCenterAPI, type ListDistributionCentersParams } from './distributionCenterAPI'
import type { DistributionCenterResponse } from './dto'

async function findAll(params: ListDistributionCentersParams = {}): Promise<DistributionCenterResponse[]> {
    return distributionCenterAPI.findAll(params)
}

export const distributionCenterService = { findAll }
