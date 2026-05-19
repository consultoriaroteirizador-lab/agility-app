import { useMutation } from '@tanstack/react-query'

import type { BaseResponse } from '@/api'
import type { Id } from '@/types/base'

import type { ServiceDraftData, SaveServiceDraftResponse } from '../dto'
import { serviceService } from '../serviceService'

interface SaveServiceDraftParams {
    id: Id
    draft: ServiceDraftData
}

/**
 * Silent background mutation that persists a service draft (in-progress evidence) on the backend.
 *
 * Intentionally does NOT open the global error modal on failure — drafts are best-effort
 * and the user shouldn't be interrupted if a save round-trip fails. The local AsyncStorage
 * mirror is still written by the caller, so no data is lost even when the network is down.
 */
export function useSaveServiceDraft() {
    const mutation = useMutation<BaseResponse<SaveServiceDraftResponse>, BaseResponse<any>, SaveServiceDraftParams>({
        mutationFn: ({ id, draft }) => serviceService.saveDraft(id, draft),
        retry: false,
        onError: (err) => {
            if (__DEV__) {
                console.warn('[useSaveServiceDraft] failed to save draft:', err?.error?.message ?? err)
            }
        },
    })

    return {
        isLoading: mutation.isPending,
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
        saveDraft: (variables: SaveServiceDraftParams) => mutation.mutate(variables),
        saveDraftAsync: (variables: SaveServiceDraftParams) => mutation.mutateAsync(variables),
    }
}
