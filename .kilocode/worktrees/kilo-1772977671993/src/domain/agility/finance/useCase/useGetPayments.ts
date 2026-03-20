import { useQuery } from '@tanstack/react-query';

import { KEY_FINANCE } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services/authCredentials/useAuthCredentialsService';

import type { ListPaymentsRequest } from '../dto';
import { financeService } from '../financeService';

export function useGetPayments(params?: ListPaymentsRequest) {
  const { authCredentials } = useAuthCredentialsService();
  const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: [KEY_FINANCE, 'payments', params],
    queryFn: () => financeService.findAll(params),
    enabled: isAuthenticated,
    retry: false,
  });

  const payments = data?.result ?? [];

  return {
    payments,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    response: data,
  };
}
