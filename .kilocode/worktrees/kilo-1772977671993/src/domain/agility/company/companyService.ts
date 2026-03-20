import { BaseResponse } from '@/api'
import type { Id } from '@/types/base'

import { companyAPI, type Company } from './companyAPI'
import type {
    CreateCompanyRequest,
    UpdateCompanyRequest,
    CompanyResponse,
    CompanyDiscoveryResponse,
} from './dto'

async function create(payload: CreateCompanyRequest): Promise<BaseResponse<CompanyResponse>> {
    return companyAPI.create(payload)
}

async function findAll(): Promise<BaseResponse<CompanyResponse[]>> {
    return companyAPI.findAll()
}

async function findOne(id: Id): Promise<BaseResponse<CompanyResponse>> {
    return companyAPI.findOne(id)
}

async function findBySlug(slug: string): Promise<BaseResponse<CompanyResponse>> {
    return companyAPI.findBySlug(slug)
}

async function update(
    id: Id,
    payload: UpdateCompanyRequest,
): Promise<BaseResponse<CompanyResponse>> {
    return companyAPI.update(id, payload)
}

async function suspend(id: Id): Promise<BaseResponse<CompanyResponse>> {
    return companyAPI.suspend(id)
}

async function activate(id: Id): Promise<BaseResponse<CompanyResponse>> {
    return companyAPI.activate(id)
}

async function remove(id: Id): Promise<BaseResponse<void>> {
    return companyAPI.remove(id)
}

async function hardRemove(id: Id): Promise<BaseResponse<void>> {
    return companyAPI.hardRemove(id)
}

async function discoverByEmail(email: string): Promise<BaseResponse<CompanyDiscoveryResponse>> {
    return companyAPI.discoverByEmail(email)
}

export type { Company }
export const companyService = {
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
