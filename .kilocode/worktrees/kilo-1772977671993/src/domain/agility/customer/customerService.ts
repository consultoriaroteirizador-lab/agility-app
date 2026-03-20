import { BaseResponse } from '@/api'
import type { Id } from '@/types/base'

import { customerAPI, type Customer } from './customerAPI'
import type {
    CreateCustomerRequest,
    UpdateCustomerRequest,
    ListCustomersRequest,
    CustomerResponse,
    CreateCustomerAddressRequest,
    UpdateCustomerAddressRequest,
    CustomerAddressResponse,
} from './dto'

type ListCustomersParams = ListCustomersRequest

async function create(payload: CreateCustomerRequest): Promise<BaseResponse<CustomerResponse>> {
    return customerAPI.create(payload)
}

async function findAll(params: ListCustomersParams = {}): Promise<BaseResponse<CustomerResponse[]>> {
    return customerAPI.findAll(params)
}

async function findOne(id: Id): Promise<BaseResponse<CustomerResponse>> {
    return customerAPI.findOne(id)
}

async function findByKeycloakUserId(keycloakUserId: Id): Promise<BaseResponse<CustomerResponse>> {
    return customerAPI.findByKeycloakUserId(keycloakUserId)
}

async function update(
    id: Id,
    payload: UpdateCustomerRequest,
): Promise<BaseResponse<CustomerResponse>> {
    return customerAPI.update(id, payload)
}

async function upgradeToVIP(id: Id): Promise<BaseResponse<CustomerResponse>> {
    return customerAPI.upgradeToVIP(id)
}

async function activate(id: Id): Promise<BaseResponse<CustomerResponse>> {
    return customerAPI.activate(id)
}

async function deactivate(id: Id): Promise<BaseResponse<CustomerResponse>> {
    return customerAPI.deactivate(id)
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    return customerAPI.remove(id)
}

async function hardRemove(id: Id): Promise<BaseResponse<void>> {
    return customerAPI.hardRemove(id)
}

// Customer Address methods
async function addAddress(
    customerId: Id,
    payload: CreateCustomerAddressRequest,
): Promise<BaseResponse<CustomerAddressResponse>> {
    return customerAPI.addAddress(customerId, payload)
}

async function listAddresses(customerId: Id): Promise<BaseResponse<CustomerAddressResponse[]>> {
    return customerAPI.listAddresses(customerId)
}

async function updateAddress(
    customerId: Id,
    addressId: Id,
    payload: UpdateCustomerAddressRequest,
): Promise<BaseResponse<CustomerAddressResponse>> {
    return customerAPI.updateAddress(customerId, addressId, payload)
}

async function removeAddress(customerId: Id, addressId: Id): Promise<BaseResponse<void>> {
    return customerAPI.removeAddress(customerId, addressId)
}

export type { Customer }
export const customerService = {
    create,
    findAll,
    findOne,
    findByKeycloakUserId,
    update,
    upgradeToVIP,
    activate,
    deactivate,
    remove,
    hardRemove,
    addAddress,
    listAddresses,
    updateAddress,
    removeAddress,
}
