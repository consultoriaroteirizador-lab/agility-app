import { useQuery } from '@tanstack/react-query';

import { KEY_FINANCE } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services/authCredentials/useAuthCredentialsService';

import type { ListPaymentsRequest, PaginatedPaymentsResponse } from '../dto';
import type { PaymentResponse } from '../dto/response/payment.response';
import { financeService } from '../financeService';

interface UseGetPaymentsOptions {
  params?: ListPaymentsRequest;
  usePagination?: boolean;
}

export function useGetPayments(options?: UseGetPaymentsOptions) {
  const { authCredentials } = useAuthCredentialsService();
  const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;
  const params = options?.params;
  const usePagination = options?.usePagination ?? !!(params?.page || params?.limit);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: [KEY_FINANCE, 'payments', params],
    queryFn: () => financeService.findAll(params),
    enabled: isAuthenticated,
    retry: false,
  });

  // Handle both paginated and non-paginated responses
  const isPaginatedResponse = (responseData: any): responseData is PaginatedPaymentsResponse<PaymentResponse> => {
    return responseData && 'data' in responseData && 'meta' in responseData;
  };

  const payments = usePagination && isPaginatedResponse(data?.result)
    ? data.result.data
    : (data?.result as PaymentResponse[]) ?? [];

  const meta = usePagination && isPaginatedResponse(data?.result)
    ? data.result.meta
    : null;

  return {
    payments,
    meta,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    response: data,
    isPaginated: usePagination && isPaginatedResponse(data?.result),
  };
}
