// src/domain/agility/finance/paymentsPage.ts
import type { PagedResponse } from '@/domain/hooks/pagination';

import type { PaginatedPaymentsResponse } from './dto/request/list-payments.request';
import type { PaymentResponse } from './dto/response/payment.response';

/**
 * `GET /finance/payments` devolve `{ data, meta: { page, totalPages, ... } }`; resposta
 * legada em array é tratada como página única.
 */
export function toPaymentsPage(
    result: PaymentResponse[] | PaginatedPaymentsResponse<PaymentResponse> | undefined | null,
    requestedPage: number,
): PagedResponse<PaymentResponse> {
    if (Array.isArray(result)) return { data: result, meta: { page: requestedPage, totalPages: requestedPage } };
    if (result && Array.isArray(result.data)) {
        return { data: result.data, meta: { page: result.meta.page, totalPages: result.meta.totalPages } };
    }
    return { data: [], meta: { page: requestedPage, totalPages: requestedPage } };
}
