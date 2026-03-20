import { useQuery } from '@tanstack/react-query';

import { KEY_FINANCE } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services/authCredentials/useAuthCredentialsService';
import type { Id } from '@/types/base';

import { financeService } from '../financeService';

export function useGetPayment(id: Id) {
  const { authCredentials } = useAuthCredentialsService();
  const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [KEY_FINANCE, 'payments', id],
    queryFn: () => financeService.findOne(id),
    enabled: isAuthenticated && !!id,
    retry: false,
  });

  return {
    payment: data?.result,
    isLoading,
    isError,
    error,
    refetch,
    response: data,
  };
}
