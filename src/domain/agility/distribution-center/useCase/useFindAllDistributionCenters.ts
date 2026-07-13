import { useQuery } from '@tanstack/react-query'

import { KEY_DISTRIBUTION_CENTERS } from '@/domain/queryKeys'

import type { ListDistributionCentersParams } from '../distributionCenterAPI'
import { distributionCenterService } from '../distributionCenterService'

export function useFindAllDistributionCenters(params?: ListDistributionCentersParams, options?: { enabled?: boolean }) {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [KEY_DISTRIBUTION_CENTERS, params?.activeOnly, params?.origin, params?.branchId],
        queryFn: () => distributionCenterService.findAll(params || {}),
        enabled: options?.enabled ?? true,
        retry: false,
    })
    return { distributionCenters: data ?? [], isLoading, isError, refetch }
}
