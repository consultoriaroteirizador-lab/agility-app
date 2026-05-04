import { useQuery } from '@tanstack/react-query'

import { KEY_FORM_GROUPS } from '@/domain/queryKeys'
import type { Id } from '@/types/base'

import { formGroupService } from '../formGroupService'

export function useFindFormGroup(id: Id | null | undefined) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [KEY_FORM_GROUPS, id],
    queryFn: () => formGroupService.findOne(id!),
    enabled: !!id,
    retry: false,
  })

  return {
    formGroup: data?.result ?? null,
    isLoading,
    isError,
  }
}
