import { useQuery } from '@tanstack/react-query'

import { KEY_SERVICES } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { serviceService } from '../serviceService'

const KEY_SERVICE_DRAFT = 'service-draft'

/**
 * Fetches the persisted draft (in-progress evidence) for a service.
 * Returns null when no draft exists.
 *
 * staleTime is 0 so the ParadaProvider always sees the latest backend draft
 * when it mounts. Refetching is opt-in via `refetch()`.
 */
export function useGetServiceDraft(id: Id | null | undefined) {
    const { data, isLoading, isError, refetch, isFetched } = useQuery({
        queryKey: [KEY_SERVICES, id, KEY_SERVICE_DRAFT],
        queryFn: () => serviceService.getDraft(id!),
        enabled: !!id,
        retry: false,
        staleTime: 0,
    })

    return {
        draft: data?.result?.data ?? null,
        draftUpdatedAt: data?.result?.draftUpdatedAt ?? null,
        isLoading,
        isError,
        isFetched,
        refetch,
    }
}
