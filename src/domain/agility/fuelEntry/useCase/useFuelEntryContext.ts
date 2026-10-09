import { useQuery } from '@tanstack/react-query';

import { KEY_FUEL_ENTRIES } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';

import { fuelEntryAPI } from '../fuelEntryAPI';

/**
 * Placa, combustível sugerido e último odômetro. 422 (sem veículo, veículo de outra filial, elétrico) é
 * resposta definitiva: sem retry, e o menu esconde o "Abastecer".
 */
export function useFuelEntryContext() {
    const { authCredentials } = useAuthCredentialsService();
    const isAuthenticated = !!authCredentials?.accessToken && !!authCredentials?.tenantId;
    const query = useQuery({
        queryKey: [KEY_FUEL_ENTRIES, 'context'],
        queryFn: () => fuelEntryAPI.getContext(),
        enabled: isAuthenticated,
        retry: false,
        staleTime: 1000 * 60 * 5,
    });
    return { context: query.data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
