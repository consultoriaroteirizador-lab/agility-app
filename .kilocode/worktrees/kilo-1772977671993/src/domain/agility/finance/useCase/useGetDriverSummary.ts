import { useQuery } from '@tanstack/react-query';

import { KEY_FINANCE } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services/authCredentials/useAuthCredentialsService';
import type { Id } from '@/types/base';

import { financeService } from '../financeService';

export function useGetDriverSummary(driverId?: Id) {
  const { authCredentials } = useAuthCredentialsService();
  const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: [KEY_FINANCE, 'summary', 'drivers', driverId],
    queryFn: () => financeService.getDriverSummary(driverId),
    enabled: isAuthenticated,
    retry: false,
  });

  const summary = data?.result ?? [];

  return {
    summary,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    response: data,
  };
}
