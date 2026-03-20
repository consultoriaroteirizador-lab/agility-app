import { BaseResponse } from '@/api'
import type { Id } from '@/types/base'

import { addressAPI, type Address } from './addressAPI'
import type {
    CreateAddressRequest,
    UpdateAddressRequest,
    ListAddressesRequest,
    AddressResponse,
    PaginatedAddressResponse,
} from './dto'

type ListAddressesParams = ListAddressesRequest

async function create(
    payload: CreateAddressRequest,
): Promise<BaseResponse<AddressResponse>> {
    return addressAPI.create(payload)
}

async function findAll(
    params: ListAddressesParams = {},
): Promise<BaseResponse<AddressResponse[] | PaginatedAddressResponse>> {
    return addressAPI.findAll(params)
}

async function findOne(id: Id): Promise<BaseResponse<AddressResponse>> {
    return addressAPI.findOne(id)
}

async function update(
    id: Id,
    payload: UpdateAddressRequest,
): Promise<BaseResponse<AddressResponse>> {
    return addressAPI.update(id, payload)
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    return addressAPI.remove(id)
}

export type { Address }
export const addressService = {
    create,
    findAll,
    findOne,
    update,
    remove,
}

