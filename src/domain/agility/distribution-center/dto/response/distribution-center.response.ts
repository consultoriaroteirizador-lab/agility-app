export interface DistributionCenterResponse {
    id: string
    name: string
    code?: string | null
    latitude: number
    longitude: number
    address?: string | null
    isActive: boolean
    branchId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
}
