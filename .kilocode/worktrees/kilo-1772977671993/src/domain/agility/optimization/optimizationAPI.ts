import { BaseResponse } from '@/api'
import { apiService } from '@/api/apiConfig'

import type {
    OptimizeRoutingRequest,
    OptimizationResultResponse,
    OptimizationLightResultResponse,
    OrsHealthResponse,
} from './dto'

async function optimize(payload: OptimizeRoutingRequest): Promise<BaseResponse<OptimizationResultResponse>> {
    const { data } = await apiService.post<BaseResponse<OptimizationResultResponse>>('/optimization/optimize', payload)
    return data
}

async function optimizeLight(payload: OptimizeRoutingRequest): Promise<BaseResponse<OptimizationLightResultResponse>> {
    const { data } = await apiService.post<BaseResponse<OptimizationLightResultResponse>>(
        '/optimization/optimize?light=true',
        payload,
    )
    return data
}

async function checkOrsHealth(): Promise<BaseResponse<OrsHealthResponse>> {
    const { data } = await apiService.get<BaseResponse<OrsHealthResponse>>('/optimization/ors/health')
    return data
}

export const optimizationAPI = {
    optimize,
    optimizeLight,
    checkOrsHealth,
}


