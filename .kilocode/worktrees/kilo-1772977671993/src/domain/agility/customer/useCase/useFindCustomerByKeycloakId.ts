import { useQuery } from '@tanstack/react-query'

import { KEY_CUSTOMERS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { customerService } from '../customerService'

export function useFindCustomerByKeycloakId(keycloakUserId: Id | null | undefined) {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: [KEY_CUSTOMERS, 'keycloak', keycloakUserId],
        queryFn: () => customerService.findByKeycloakUserId(keycloakUserId!),
        enabled: !!keycloakUserId,
        retry: false,
    })

    return {
        customer: data?.result ?? null,
        isLoading,
        isError,
        refetch,
        isRefetching,
        response: data,
    }
}

