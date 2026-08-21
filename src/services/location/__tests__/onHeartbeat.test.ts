/**
 * O heartbeat existe para manter o "visto por último" fresco quando o motorista
 * está disponível e PARADO — é o único caso em que ele não gera posição por
 * movimento. Só que ele fazia meio trabalho.
 *
 * `getCurrentPosition({ persist: true })` apenas ENFILEIRA no banco local do
 * SDK; o POST só dispara quando a fila chega ao `autoSyncThreshold` (5). Parado,
 * o motorista produz uma posição por minuto e nunca completa o lote sozinho —
 * as cinco saíam juntas ~5 min depois (medido no dev em 11/08/2026: capturada
 * às 13:53:51, recebida às 13:59:35).
 *
 * O `requestCurrentPosition` já resolveu isso para o "report imediato", com
 * teste próprio. O heartbeat repetia só a primeira metade, e o comentário dele
 * afirmava que POSTava. Estes testes travam o flush aqui também: sem ele, o
 * painel de monitoramento mostra um motorista vivo como se estivesse velho.
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

import { onHeartbeatHandler } from '../backgroundLocationService';

/** O evento que o SDK entrega: só a ÚLTIMA posição conhecida, não uma nova. */
const heartbeatEvent = (comLocation = true) =>
    ({
        location: comLocation
            ? { coords: { latitude: -23.5, longitude: -46.6 } }
            : null,
    }) as never;

describe('onHeartbeatHandler', () => {
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

    it('lê uma posição FRESCA — o `location` do evento é só o último conhecido', async () => {
        onHeartbeatHandler(heartbeatEvent());
        await Promise.resolve();

        expect(mockGetCurrentPosition).toHaveBeenCalledWith(
            expect.objectContaining({ samples: 1, persist: true }),
        );
    });

    it('FORÇA o envio — sem isto a posição fica presa na fila do lote', async () => {
        // É esta a asserção que pega a regressão: ler sem esvaziar deixa o
        // motorista parado aparecendo como velho no monitoramento.
        onHeartbeatHandler(heartbeatEvent());
        await Promise.resolve();
        await Promise.resolve();

        expect(mockSync).toHaveBeenCalledTimes(1);
    });

    it('esvazia a fila mesmo quando a leitura falha', async () => {
        // Sem coordenada nova ainda pode haver posições presas de lotes
        // anteriores — drenar é melhor que o motorista sumir do mapa.
        mockGetCurrentPosition.mockRejectedValue(new Error('GPS indisponível'));

        onHeartbeatHandler(heartbeatEvent());
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(mockSync).toHaveBeenCalledTimes(1);
    });

    it('evento sem posição conhecida não impede a leitura nem o envio', async () => {
        onHeartbeatHandler(heartbeatEvent(false));
        await Promise.resolve();
        await Promise.resolve();

        expect(mockGetCurrentPosition).toHaveBeenCalled();
        expect(mockSync).toHaveBeenCalledTimes(1);
    });

    it('não lança quando o envio falha — o handler é chamado pelo SDK, sem catch', async () => {
        mockSync.mockRejectedValue(new Error('sem rede'));

        expect(() => onHeartbeatHandler(heartbeatEvent())).not.toThrow();
        await Promise.resolve();
        await Promise.resolve();
    });
});
