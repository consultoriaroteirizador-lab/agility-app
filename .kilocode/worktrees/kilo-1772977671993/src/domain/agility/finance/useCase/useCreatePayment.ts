import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KEY_FINANCE } from '@/domain/queryKeys';

import type { CreatePaymentRequest } from '../dto';
import { financeService } from '../financeService';

export function useCreatePayment() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: CreatePaymentRequest) => financeService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY_FINANCE] });
    },
  });

  const { mutateAsync: createPayment, isLoading, isError, error, reset } = mutation;

  return {
    createPayment,
    isLoading,
    isError,
    error,
    reset,
  };
}
