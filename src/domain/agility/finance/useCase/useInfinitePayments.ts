// src/domain/agility/finance/useCase/useInfinitePayments.ts
import { useInfinitePagedList } from '@/domain/hooks/useInfinitePagedList';
import { KEY_FINANCE } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services/authCredentials/useAuthCredentialsService';

import type { PaymentResponse } from '../dto/response/payment.response';
import { financeAPI } from '../financeAPI';
import { toPaymentsPage } from '../paymentsPage';

const PAYMENTS_PAGE_SIZE = 50;

/**
 * Cobranças do motorista desde `startDate` (`yyyy-MM-dd`, dia de São Paulo — o back usa
 * `startOfDaySaoPaulo`). O `driverId` vem do token no back (`resolveDriverScope`).
 */
export function useInfinitePayments(range: { startDate: string }) {
    const { authCredentials } = useAuthCredentialsService();
    const enabled = !!authCredentials?.accessToken && !!authCredentials?.tenantId;

    return useInfinitePagedList<PaymentResponse>(
        [KEY_FINANCE, 'payments', 'infinite', range],
        async (page) => {
            const response = await financeAPI.findAll({ startDate: range.startDate, page, limit: PAYMENTS_PAGE_SIZE });
            return toPaymentsPage(response.result, page);
        },
        { enabled },
    );
}
