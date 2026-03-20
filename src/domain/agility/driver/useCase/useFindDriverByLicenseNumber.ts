import { useQuery } from '@tanstack/react-query'

import { KEY_DRIVERS } from '@/domain/queryKeys'

import { driverService } from '../driverService'

export function useFindDriverByLicenseNumber(licenseNumber: string | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_DRIVERS, 'license', licenseNumber],
        queryFn: () => driverService.findByLicenseNumber(licenseNumber!),
        enabled: !!licenseNumber,
        retry: false,
    })

    return {
        driver: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

