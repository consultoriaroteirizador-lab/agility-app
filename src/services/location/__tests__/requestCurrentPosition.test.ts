/**
 * O "report imediato" precisa SAIR do aparelho na hora.
 *
 * Medido no dev em 11/08/2026: o app capturou a posição às 13:53:51 e o
 * servidor só a recebeu às 13:59:35 — 5min44s depois, junto com outras 4, todas
 * com o mesmo `created_at`. A causa é a config de HTTP do SDK
 * (`autoSync: true` + `autoSyncThreshold: 5`): `persist: true` apenas ENFILEIRA,
 * e o POST só dispara quando a fila chega a 5. Parado, o motorista nunca
 * completa o lote e não aparece no mapa.
 *
 * Estes testes travam o flush explícito. Sem ele o "report imediato" não é
 * imediato, contrariando o próprio nome e o motivo de existir (aparecer rápido
 * no mapa e não ser varrido pelo cron por "nunca ter reportado").
 */

// Prefixo `mock` é exigência do jest: só variáveis assim podem ser referenciadas
// dentro da fábrica de `jest.mock`, que é içada para o topo do arquivo.
const mockGetCurrentPosition = jest.fn();
const mockSync = jest.fn();

jest.mock('react-native-background-geolocation', () => ({
    __esModule: true,
    default: {
        getCurrentPosition: (...args: unknown[]) => mockGetCurrentPosition(...args),
        sync: (...args: unknown[]) => mockSync(...args),
    },
}));

import { requestCurrentPosition } from '../backgroundLocationService';

describe('requestCurrentPosition', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetCurrentPosition.mockResolvedValue({ coords: {} });
        mockSync.mockResolvedValue([]);
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('persiste a posição E força o envio (não deixa na fila do lote)', async () => {
        await requestCurrentPosition();

        expect(mockGetCurrentPosition).toHaveBeenCalledWith(
            expect.objectContaining({ samples: 1, persist: true }),
        );
        expect(mockSync).toHaveBeenCalledTimes(1);
    });

    // Sem coordenada nova, ainda pode haver posições presas na fila de lotes
    // anteriores — esvaziar continua sendo melhor que o motorista sumir do mapa.
    it('força o envio mesmo se a leitura da posição falhar', async () => {
        mockGetCurrentPosition.mockRejectedValue(new Error('GPS indisponível'));

        await expect(requestCurrentPosition()).resolves.toBeUndefined();

        expect(mockSync).toHaveBeenCalledTimes(1);
    });

    // É chamada com `void` no LocationTrackingProvider: uma rejeição aqui vira
    // unhandled rejection, não erro tratado.
    it('não propaga erro quando o envio falha', async () => {
        mockSync.mockRejectedValue(new Error('sem rede'));

        await expect(requestCurrentPosition()).resolves.toBeUndefined();
    });
});
