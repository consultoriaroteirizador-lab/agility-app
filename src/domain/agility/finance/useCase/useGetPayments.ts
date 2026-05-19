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

  // O backend pode retornar tanto `result: PaymentResponse[]` (legado) quanto
  // `result: { data: PaymentResponse[], meta: {...} }` (atual). Desempacota
  // automaticamente independentemente do flag usePagination — esse flag controla
  // apenas se `meta` é exposto.
  const isPaginatedResponse = (responseData: any): responseData is PaginatedPaymentsResponse<PaymentResponse> => {
    return responseData && typeof responseData === 'object' && Array.isArray(responseData.data) && 'meta' in responseData;
  };

  const result = data?.result;
  const paginated = isPaginatedResponse(result);

  const payments: PaymentResponse[] = paginated
    ? result.data
    : Array.isArray(result) ? result : [];

  const meta = paginated ? result.meta : null;

  return {
    payments,
    meta,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    response: data,
    isPaginated: paginated,
  };
}
