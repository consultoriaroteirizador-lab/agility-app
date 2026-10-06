// src/domain/agility/wallet/dto/request/wallet.request.ts

import { PixKeyType } from '../types';

/**
 * `PATCH /wallet/bank-info`. `undefined` = não mexe; `null` = APAGA (o `@IsOptional` do
 * DTO pula null e a entidade grava todo campo `!== undefined`). Campo a mais = 400.
 */
export interface UpdateBankInfoRequest {
    bankName?: string | null;
    bankAgency?: string | null;
    bankAccount?: string | null;
    pixKey?: string | null;
    pixKeyType?: PixKeyType | null;
}

export interface CreateWithdrawalRequest {
    amount: number;
    /**
     * Trava de toque duplo (F6). UMA por montagem da tela de saque, reenviada em toda tentativa
     * daquela tela (R1 da F5c). Repetição devolve o saque já gravado; outro valor = 400
     * IDEMPOTENCY_KEY_REUSED. Só pode ir para o ar com o back da F6 no ambiente (forbidNonWhitelisted).
     */
    idempotencyKey: string;
}

export interface ListTransactionsRequest {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}
