/**
 * O back (`AllExceptionsFilter`) repassa dentro de `error` os campos extras da exceção —
 * ex.: `maxAmountCents` na recusa do saque pela política de dívida (F3). O adaptador do app
 * montava `error` com três campos fixos e o resto sumia aqui.
 */
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import { baseResponseAdapter } from '../baseResponseAdapter';
import type { BaseResponseAPI } from '../baseResponseAPI';

function erroComResposta(data: unknown): AxiosError<BaseResponseAPI<unknown>> {
    const config = { headers: new AxiosHeaders() };
    const response = { data, status: 400, statusText: 'Bad Request', headers: {}, config } as unknown as AxiosResponse<BaseResponseAPI<unknown>>;
    return new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, undefined, response);
}

describe('toBaseResponseError', () => {
    it('preserva os campos extras do back (maxAmountCents da recusa do saque)', () => {
        const r = baseResponseAdapter.toBaseResponseError(
            erroComResposta({
                success: false,
                message: 'Com R$ 30,00 em dívidas abertas, o saque máximo é R$ 70,00.',
                result: null,
                error: {
                    message: 'Com R$ 30,00 em dívidas abertas, o saque máximo é R$ 70,00.',
                    code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT',
                    validationErrors: null,
                    maxAmountCents: 7000,
                },
            }),
        );
        expect(r.error).toEqual({
            message: 'Com R$ 30,00 em dívidas abertas, o saque máximo é R$ 70,00.',
            code: 'WITHDRAWAL_EXCEEDS_AMOUNT_ABOVE_DEBT',
            validationErrors: [],
            maxAmountCents: 7000,
        });
    });

    it('os campos do envelope continuam com os mesmos padrões (o extra não os substitui)', () => {
        const r = baseResponseAdapter.toBaseResponseError(
            erroComResposta({ success: false, error: { message: '', validationErrors: null, violations: ['x'] } }),
        );
        expect(r.error).toEqual({ message: 'Erro desconhecido', code: 'N/A', validationErrors: [], violations: ['x'] });
    });

    it('sem resposta do servidor: continua AU-000, sem extras', () => {
        const config = { headers: new AxiosHeaders() };
        const r = baseResponseAdapter.toBaseResponseError(new AxiosError('Network Error', 'ERR_NETWORK', config));
        expect(r).toEqual({
            success: false,
            error: { message: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.', code: 'AU-000' },
        });
    });
});
