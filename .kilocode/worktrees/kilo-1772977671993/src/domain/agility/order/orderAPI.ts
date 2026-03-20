import { apiAgility } from '@/api/apiConfig'
import type { BaseResponse } from '@/api/baseResponse'
import type { Id } from '@/types/base'

export type Order = { id: Id } & Record<string, unknown>

type ListOrdersParams = { page?: number; limit?: number; customerId?: Id; status?: string }

export async function create(payload: Record<string, unknown>): Promise<BaseResponse<Order>> {
    const { data } = await apiAgility.post<BaseResponse<Order>>('/orders', payload)
    return data
}

export async function findAll(params: ListOrdersParams = {}): Promise<BaseResponse<Order[]>> {
    const qs = new URLSearchParams()
    if (params.customerId) qs.append('customerId', params.customerId)
    if (params.status) qs.append('status', params.status)
    if (params.page) qs.append('page', String(params.page))
    if (params.limit) qs.append('limit', String(params.limit))
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const { data } = await apiAgility.get<BaseResponse<Order[]>>(`/orders${suffix}`)
    return data
}

export async function findOne(id: Id): Promise<BaseResponse<Order>> {
    const { data } = await apiAgility.get<BaseResponse<Order>>(`/orders/${id}`)
    return data
}

export async function update(id: Id, payload: Record<string, unknown>): Promise<BaseResponse<Order>> {
    const { data } = await apiAgility.patch<BaseResponse<Order>>(`/orders/${id}`, payload)
    return data
}

export async function schedule(id: Id): Promise<BaseResponse<Order>> {
    const { data } = await apiAgility.patch<BaseResponse<Order>>(`/orders/${id}/schedule`)
    return data
}

export async function start(id: Id): Promise<BaseResponse<Order>> {
    const { data } = await apiAgility.patch<BaseResponse<Order>>(`/orders/${id}/start`)
    return data
}

export async function complete(id: Id): Promise<BaseResponse<Order>> {
    const { data } = await apiAgility.patch<BaseResponse<Order>>(`/orders/${id}/complete`)
    return data
}

export async function cancel(id: Id): Promise<BaseResponse<Order>> {
    const { data } = await apiAgility.patch<BaseResponse<Order>>(`/orders/${id}/cancel`)
    return data
}

export async function remove(id: Id): Promise<BaseResponse<void>> {
    const { data } = await apiAgility.delete<BaseResponse<void>>(`/orders/${id}`)
    return data
}