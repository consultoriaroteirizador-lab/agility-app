import { BaseResponse } from '@/api';
import { apiAgility } from '@/api/apiConfig';

import type { ListPaymentsRequest, PaginatedPaymentsResponse, PaymentResponse } from './dto';

/**
 * Só a leitura do motorista (`GET /finance/payments`, `driverId` forçado pelo token).
 * Criar, editar e remover pagamento é gesto do operador (`@Roles('COLLABORATOR_ADMIN'...)`
 * no back): os hooks que chamavam esses endpoints davam 403 no app e saíram na F5.
 */
async function findAll(
    params: ListPaymentsRequest = {},
): Promise<BaseResponse<PaymentResponse[] | PaginatedPaymentsResponse<PaymentResponse>>> {
    const { data } = await apiAgility.get<BaseResponse<PaymentResponse[] | PaginatedPaymentsResponse<PaymentResponse>>>('/finance/payments', {
        params: {
            ...(params.routingId && { routingId: params.routingId }),
            ...(params.serviceId && { serviceId: params.serviceId }),
            ...(params.status && { status: params.status }),
            ...(params.startDate && { startDate: params.startDate }),
            ...(params.endDate && { endDate: params.endDate }),
            ...(params.page && { page: params.page }),
            ...(params.limit && { limit: params.limit }),
        },
    });
    return data;
}

export const financeAPI = {
    findAll,
};
