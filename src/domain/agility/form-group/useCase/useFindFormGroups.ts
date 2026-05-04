import { useQuery } from '@tanstack/react-query'

import { KEY_FORM_GROUPS } from '@/domain/queryKeys'

import type { FormGroupResponse } from '../dto/form-group.response'
import { formGroupService } from '../formGroupService'

export function useFindFormGroups(ids: string[] | null | undefined) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [KEY_FORM_GROUPS, 'batch', ids],
    queryFn: async () => {
      const results: FormGroupResponse[] = []
      for (const id of ids!) {
        const response = await formGroupService.findOne(id)
        if (response.result) {
          results.push(response.result)
        }
      }
      return results
    },
    enabled: !!ids && ids.length > 0,
    retry: false,
  })

  return {
    formGroups: data ?? [],
    isLoading,
    isError,
  }
}
