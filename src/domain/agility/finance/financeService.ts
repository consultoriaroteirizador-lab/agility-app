import { BaseResponse } from '@/api'
import type { Id } from '@/types/base'

import type {
    CreatePaymentRequest,
    UpdatePaymentRequest,
    ListPaymentsRequest,
    PaymentResponse,
    PaginatedPaymentsResponse,
    DriverSummaryItem,
} from './dto'
import { financeAPI } from './financeAPI'

/**
 * Finance service layer
 * Can add validation, transformation, or business logic here
 */
async function create(payload: CreatePaymentRequest): Promise<BaseResponse<PaymentResponse>> {
    return financeAPI.create(payload)
}

async function findAll(params: ListPaymentsRequest = {}): Promise<BaseResponse<PaymentResponse[] | PaginatedPaymentsResponse<PaymentResponse>>> {
    return financeAPI.findAll(params)
}

async function findOne(id: Id): Promise<BaseResponse<PaymentResponse>> {
    return financeAPI.findOne(id)
}

async function update(
    id: Id,
    payload: UpdatePaymentRequest,
): Promise<BaseResponse<PaymentResponse>> {
    return financeAPI.update(id, payload)
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    return financeAPI.remove(id)
}

async function getDriverSummary(driverId?: Id): Promise<BaseResponse<DriverSummaryItem[]>> {
    return financeAPI.getDriverSummary(driverId)
}

export const financeService = {
    create,
    findAll,
    findOne,
    update,
    remove,
    getDriverSummary,
}
