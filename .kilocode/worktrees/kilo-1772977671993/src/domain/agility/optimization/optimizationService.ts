import { BaseResponse } from '@/api'

import type {
    OptimizeRoutingRequest,
    OptimizationResultResponse,
    OptimizationLightResultResponse,
    OrsHealthResponse,
} from './dto'
import { optimizationAPI } from './optimizationAPI'

async function optimize(payload: OptimizeRoutingRequest): Promise<BaseResponse<OptimizationResultResponse>> {
    return optimizationAPI.optimize(payload)
}

async function optimizeLight(payload: OptimizeRoutingRequest): Promise<BaseResponse<OptimizationLightResultResponse>> {
    return optimizationAPI.optimizeLight(payload)
}

async function checkOrsHealth(): Promise<BaseResponse<OrsHealthResponse>> {
    return optimizationAPI.checkOrsHealth()
}

export const optimizationService = {
    optimize,
    optimizeLight,
    checkOrsHealth,
}


