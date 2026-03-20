import { BaseResponse } from '@/api'
import { apiService } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type {
    CreateCustomerRequest,
    UpdateCustomerRequest,
    ListCustomersRequest,
    CustomerResponse,
    CreateCustomerAddressRequest,
    UpdateCustomerAddressRequest,
    CustomerAddressResponse,
} from './dto'


// Export CustomerResponse as Customer for backward compatibility
export type Customer = CustomerResponse

type ListCustomersParams = ListCustomersRequest

async function create(payload: CreateCustomerRequest): Promise<BaseResponse<CustomerResponse>> {
    const { data } = await apiService.post<BaseResponse<CustomerResponse>>('/customers', payload)
    return data
}

async function findAll(params: ListCustomersParams = {}): Promise<BaseResponse<CustomerResponse[]>> {
    const { data } = await apiService.get<BaseResponse<CustomerResponse[]>>('/customers', {
        params: {
            ...(params.type && { type: params.type }),
        },
    })
    return data
}

async function findOne(id: Id): Promise<BaseResponse<CustomerResponse>> {
    const { data } = await apiService.get<BaseResponse<CustomerResponse>>(`/customers/${id}`)
    return data
}

async function findByKeycloakUserId(keycloakUserId: Id): Promise<BaseResponse<CustomerResponse>> {
    const { data } = await apiService.get<BaseResponse<CustomerResponse>>(`/customers/keycloak/${keycloakUserId}`)
    return data
}

async function update(
    id: Id,
    payload: UpdateCustomerRequest,
): Promise<BaseResponse<CustomerResponse>> {
    const { data } = await apiService.patch<BaseResponse<CustomerResponse>>(`/customers/${id}`, payload)
    return data
}

async function upgradeToVIP(id: Id): Promise<BaseResponse<CustomerResponse>> {
    const { data } = await apiService.patch<BaseResponse<CustomerResponse>>(`/customers/${id}/upgrade-vip`)
    return data
}

async function activate(id: Id): Promise<BaseResponse<CustomerResponse>> {
    const { data } = await apiService.patch<BaseResponse<CustomerResponse>>(`/customers/${id}/activate`)
    return data
}

async function deactivate(id: Id): Promise<BaseResponse<CustomerResponse>> {
    const { data } = await apiService.patch<BaseResponse<CustomerResponse>>(`/customers/${id}/deactivate`)
    return data
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    const { data } = await apiService.delete<BaseResponse<void>>(`/customers/${id}`)
    return data
}

async function hardRemove(id: Id): Promise<BaseResponse<void>> {
    const { data } = await apiService.delete<BaseResponse<void>>(`/customers/${id}/hard`)
    return data
}

// Customer Address endpoints
async function addAddress(
    customerId: Id,
    payload: CreateCustomerAddressRequest,
): Promise<BaseResponse<CustomerAddressResponse>> {
    const { data } = await apiService.post<BaseResponse<CustomerAddressResponse>>(`/customers/${customerId}/addresses`, payload)
    return data
}

async function listAddresses(customerId: Id): Promise<BaseResponse<CustomerAddressResponse[]>> {
    const { data } = await apiService.get<BaseResponse<CustomerAddressResponse[]>>(`/customers/${customerId}/addresses`)
    return data
}

async function updateAddress(
    customerId: Id,
    addressId: Id,
    payload: UpdateCustomerAddressRequest,
): Promise<BaseResponse<CustomerAddressResponse>> {
    const { data } = await apiService.patch<BaseResponse<CustomerAddressResponse>>(`/customers/${customerId}/addresses/${addressId}`, payload)
    return data
}

async function removeAddress(customerId: Id, addressId: Id): Promise<BaseResponse<void>> {
    const { data } = await apiService.delete<BaseResponse<void>>(`/customers/${customerId}/addresses/${addressId}`)
    return data
}

export const customerAPI = {
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

