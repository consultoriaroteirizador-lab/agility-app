/**
 * Registrar o insucesso encerra a tentativa: o rascunho da PARADA (etapa, evidência)
 * some do aparelho e do servidor. Sem isso, a tentativa seguinte do mesmo pedido
 * reabria na etapa da anterior.
 */
import { clearParadaDraftEverywhere } from '../paradaDraftCleanup';

describe('clearParadaDraftEverywhere', () => {
    it('apaga o rascunho local e o do servidor do pedido', async () => {
        const clearLocal = jest.fn().mockResolvedValue(undefined);
        const clearRemote = jest.fn().mockResolvedValue(undefined);

        await clearParadaDraftEverywhere('s1', { clearLocal, clearRemote });

        expect(clearLocal).toHaveBeenCalledWith('s1');
        expect(clearRemote).toHaveBeenCalledWith('s1');
    });

    it('falha de rede no servidor não trava o fluxo e o local ainda é apagado', async () => {
        const clearLocal = jest.fn().mockResolvedValue(undefined);
        const clearRemote = jest.fn().mockRejectedValue(new Error('Network Error'));

        await expect(clearParadaDraftEverywhere('s1', { clearLocal, clearRemote })).resolves.toBeUndefined();
        expect(clearLocal).toHaveBeenCalledWith('s1');
    });

    it('falha ao apagar o local não impede o apagamento no servidor', async () => {
        const clearLocal = jest.fn().mockRejectedValue(new Error('storage'));
        const clearRemote = jest.fn().mockResolvedValue(undefined);

        await expect(clearParadaDraftEverywhere('s1', { clearLocal, clearRemote })).resolves.toBeUndefined();
        expect(clearRemote).toHaveBeenCalledWith('s1');
    });

    it('sem serviceId não chama nada', async () => {
        const clearLocal = jest.fn();
        const clearRemote = jest.fn();

        await clearParadaDraftEverywhere(undefined, { clearLocal, clearRemote });

        expect(clearLocal).not.toHaveBeenCalled();
        expect(clearRemote).not.toHaveBeenCalled();
    });
});
