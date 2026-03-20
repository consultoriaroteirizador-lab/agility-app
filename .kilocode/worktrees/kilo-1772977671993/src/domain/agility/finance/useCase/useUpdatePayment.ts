import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_FINANCE } from '@/domain/queryKeys';
import type { Id } from '@/types/base';

import type { UpdatePaymentRequest } from '../dto';
import { financeService } from '../financeService';

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: Id; payload: UpdatePaymentRequest }) =>
      financeService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY_FINANCE] });
    },
  });

  const { mutateAsync: updatePayment, isLoading, isError, error, reset } = mutation;

  return {
    updatePayment,
    isLoading,
    isError,
    error,
    reset,
  };
}
