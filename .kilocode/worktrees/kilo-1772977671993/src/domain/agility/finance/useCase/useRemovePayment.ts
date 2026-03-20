import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_FINANCE } from '@/domain/queryKeys';
import type { Id } from '@/types/base';

import { financeService } from '../financeService';

export function useRemovePayment() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: Id) => financeService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY_FINANCE] });
    },
  });

  const { mutateAsync: removePayment, isLoading, isError, error, reset } = mutation;

  return {
    removePayment,
    isLoading,
    isError,
    error,
    reset,
  };
}
