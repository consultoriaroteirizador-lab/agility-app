import { useQuery } from '@tanstack/react-query'

import { KEY_OCCURRENCE_REASONS } from '@/domain/queryKeys'
import { saveOccurrenceReasonsMirror } from '@/services/storage/occurrenceReasonsStorage'

import type { OrderOccurrenceReasonResponse } from '../dto'
import { orderOccurrenceReasonService } from '../orderOccurrenceReasonService'

export function useFindOccurrenceReasons(context?: 'TRANSFER' | 'LAST_MILE' | 'SERVICE') {
  const { data, isLoading, isError } = useQuery({
    queryKey: [KEY_OCCURRENCE_REASONS, context ?? 'all'],
    queryFn: async () => {
      const res = await orderOccurrenceReasonService.findAllActive(context)
      const list = res.result ?? []
      if (list.length > 0) void saveOccurrenceReasonsMirror(list, context) // warm mirror on success
      return list
    },
    // Bug 1b: a lista de motivos NÃO pode ser cacheada — config/motivos mudam por
    // empresa e o motorista precisa sempre da versão atual do servidor. staleTime 0 +
    // refetchOnMount 'always' garante refetch a cada abertura do fluxo. O mirror offline
    // (saveOccurrenceReasonsMirror) segue como fallback só quando a query falha.
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false,
  })

  // fallback: quando a query falha/offline e nunca carregou, o consumidor lê o mirror
  // via loadOccurrenceReasonsMirror() quando reasons.length === 0 && isError (Task 3).
  const reasons: OrderOccurrenceReasonResponse[] = data ?? []

  return { reasons, isLoading, isError }
}
