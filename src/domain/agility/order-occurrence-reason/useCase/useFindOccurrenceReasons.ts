import { useQuery } from '@tanstack/react-query'

import { KEY_OCCURRENCE_REASONS } from '@/domain/queryKeys'
import { saveOccurrenceReasonsMirror } from '@/services/storage/occurrenceReasonsStorage'

import type { OrderOccurrenceReasonResponse } from '../dto'
import { orderOccurrenceReasonService } from '../orderOccurrenceReasonService'

export function useFindOccurrenceReasons() {
  const { data, isLoading, isError } = useQuery({
    queryKey: [KEY_OCCURRENCE_REASONS],
    queryFn: async () => {
      const res = await orderOccurrenceReasonService.findAllActive()
      const list = res.result ?? []
      if (list.length > 0) void saveOccurrenceReasonsMirror(list) // warm mirror on success
      return list
    },
    staleTime: 1000 * 60 * 30, // catálogo é estável
    retry: false,
  })

  // fallback: quando a query falha/offline e nunca carregou, o consumidor lê o mirror
  // via loadOccurrenceReasonsMirror() quando reasons.length === 0 && isError (Task 3).
  const reasons: OrderOccurrenceReasonResponse[] = data ?? []

  return { reasons, isLoading, isError }
}
