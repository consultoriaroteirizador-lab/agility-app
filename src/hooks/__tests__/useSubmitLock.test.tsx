import React from 'react';

import TestRenderer, { act } from 'react-test-renderer';

import { useSubmitLock } from '../useSubmitLock';

let trava!: ReturnType<typeof useSubmitLock>;
function Probe() {
    trava = useSubmitLock();
    return null;
}

beforeEach(() => {
    act(() => {
        TestRenderer.create(<Probe />);
    });
});

describe('useSubmitLock', () => {
    it('segundo envio com o primeiro em voo não chama a função', async () => {
        let terminar!: () => void;
        const fn = jest.fn(() => new Promise<void>((resolve) => (terminar = resolve)));

        let primeiro!: Promise<unknown>;
        let segundo!: Promise<unknown>;
        act(() => {
            primeiro = trava.run(fn);
            segundo = trava.run(fn);
        });

        expect(fn).toHaveBeenCalledTimes(1);
        expect(trava.isLocked()).toBe(true);
        expect(trava.isSubmitting).toBe(true);
        await expect(segundo).resolves.toBeUndefined();

        await act(async () => {
            terminar();
            await primeiro;
        });
        expect(trava.isLocked()).toBe(false);
        expect(trava.isSubmitting).toBe(false);
    });

    it('erro relança e destrava', async () => {
        const erro = { success: false, error: { message: 'Saldo disponível insuficiente' } };

        await act(async () => {
            await expect(trava.run(() => Promise.reject(erro))).rejects.toBe(erro);
        });

        expect(trava.isLocked()).toBe(false);
        const fn = jest.fn(() => Promise.resolve('ok'));
        await act(async () => {
            await expect(trava.run(fn)).resolves.toBe('ok');
        });
        expect(fn).toHaveBeenCalledTimes(1);
    });
});
