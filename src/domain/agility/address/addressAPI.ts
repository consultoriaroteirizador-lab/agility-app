import { BaseResponse } from '@/api'
import { apiService } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type {
    CreateAddressRequest,
    UpdateAddressRequest,
    ListAddressesRequest,
    AddressResponse,
    PaginatedAddressResponse,
} from './dto'


// Export AddressResponse as Address for backward compatibility
export type Address = AddressResponse

type ListAddressesParams = ListAddressesRequest

async function create(payload: CreateAddressRequest): Promise<BaseResponse<AddressResponse>> {
    const { data } = await apiService.post<BaseResponse<AddressResponse>>('/addresses', payload)
    return data
}

async function findAll(
    params: ListAddressesParams = {},
): Promise<BaseResponse<AddressResponse[] | PaginatedAddressResponse>> {
    const { data } = await apiService.get<BaseResponse<AddressResponse[] | PaginatedAddressResponse>>('/addresses', {
        params: {
            ...(params.postalCode && { postalCode: params.postalCode }),
            ...(params.page && { page: params.page }),
            ...(params.limit && { limit: params.limit }),
        },
    })
    return data
}

async function findOne(id: Id): Promise<BaseResponse<AddressResponse>> {
    const { data } = await apiService.get<BaseResponse<AddressResponse>>(`/addresses/${id}`)
    return data
}

async function update(
    id: Id,
    payload: UpdateAddressRequest,
): Promise<BaseResponse<AddressResponse>> {
    const { data } = await apiService.patch<BaseResponse<AddressResponse>>(`/addresses/${id}`, payload)
    return data
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    const { data } = await apiService.delete<BaseResponse<void>>(`/addresses/${id}`)
    return data
}

export const addressAPI = {
    create,
    findAll,
    findOne,
    update,
    remove,
}

