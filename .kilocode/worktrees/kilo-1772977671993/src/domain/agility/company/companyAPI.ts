import { BaseResponse } from '@/api'
import { apiService } from '@/api/apiConfig'
import type { Id } from '@/types/base'

import type {
    CreateCompanyRequest,
    UpdateCompanyRequest,
    CompanyResponse,
    CompanyDiscoveryResponse,
} from './dto'


// Export CompanyResponse as Company for backward compatibility
export type Company = CompanyResponse

async function create(payload: CreateCompanyRequest): Promise<BaseResponse<CompanyResponse>> {
    const { data } = await apiService.post<BaseResponse<CompanyResponse>>('/companies', payload)
    return data
}

async function findAll(): Promise<BaseResponse<CompanyResponse[]>> {
    const { data } = await apiService.get<BaseResponse<CompanyResponse[]>>('/companies')
    return data
}

async function findOne(id: Id): Promise<BaseResponse<CompanyResponse>> {
    const { data } = await apiService.get<BaseResponse<CompanyResponse>>(`/companies/${id}`)
    return data
}

async function findBySlug(slug: string): Promise<BaseResponse<CompanyResponse>> {
    const { data } = await apiService.get<BaseResponse<CompanyResponse>>(`/companies/slug/${slug}`)
    return data
}

async function update(
    id: Id,
    payload: UpdateCompanyRequest,
): Promise<BaseResponse<CompanyResponse>> {
    const { data } = await apiService.patch<BaseResponse<CompanyResponse>>(`/companies/${id}`, payload)
    return data
}

async function suspend(id: Id): Promise<BaseResponse<CompanyResponse>> {
    const { data } = await apiService.patch<BaseResponse<CompanyResponse>>(`/companies/${id}/suspend`)
    return data
}

async function activate(id: Id): Promise<BaseResponse<CompanyResponse>> {
    const { data } = await apiService.patch<BaseResponse<CompanyResponse>>(`/companies/${id}/activate`)
    return data
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    const { data } = await apiService.delete<BaseResponse<void>>(`/companies/${id}`)
    return data
}

async function hardRemove(id: Id): Promise<BaseResponse<void>> {
    const { data } = await apiService.delete<BaseResponse<void>>(`/companies/${id}/hard`)
    return data
}

async function discoverByEmail(email: string): Promise<BaseResponse<CompanyDiscoveryResponse>> {
    console.log('email', email)
    const { data } = await apiService.get<BaseResponse<CompanyDiscoveryResponse>>(`/companies/discover/${email}`)
    return data
}

export const companyAPI = {
    create,
    findAll,
    findOne,
    findBySlug,
    update,
    suspend,
    activate,
    remove,
    hardRemove,
    discoverByEmail,
}
