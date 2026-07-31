/**
 * O destino depois de fechar uma nota precisa de uma função com IDENTIDADE
 * ESTÁVEL.
 *
 * Bug real, achado com o app na mão e provado por log (31/07/2026): as quatro
 * telas de fechamento armam o redirect num `useEffect` que tem essa função nas
 * dependências. Quando a identidade dela mudava a cada refetch da lista de
 * serviços da rota (`pedidosDaParada` é um array novo a cada resposta), a tela
 * JÁ CONCLUÍDA — que continua montada, porque o destino final é `push` e não
 * `replace` — re-armava o timer e navegava DE NOVO, arrastando o motorista para
 * fora da tela em que ele estava:
 *
 *   entrega/redirect ARMOU timer   (nota A, showSuccess=true)
 *   ...motorista abre OUTRA parada...
 *   entrega/redirect ARMOU timer   ← a tela da nota A ainda viva
 *   destinoAposNota CHAMADO {"notaAtualId":"<nota A>"}  → push(rota)
 *
 * O efeito original dependia só de valores estáveis e disparava UMA vez. Estes
 * testes congelam as duas propriedades que a correção precisa ter ao mesmo
 * tempo: identidade estável (não re-arma) E decisão com o dado mais recente
 * (não decide com lista velha).
 */
import React from 'react';

import TestRenderer, { act } from 'react-test-renderer';

import type { ServiceResponse } from '@/domain/agility/service/dto';

import { useDestinoAposNota } from '../useDestinoAposNota';

const mockPush = jest.fn();
const mockDismissTo = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({ push: mockPush, dismissTo: mockDismissTo }),
}));

function nota(over: Partial<ServiceResponse> & { id: string }): ServiceResponse {
    return { isCompleted: false, isCanceled: false, isFailed: false, ...over } as unknown as ServiceResponse;
}

/** Renderiza o hook e devolve um jeito de re-renderizar com props novas. */
function montar(pedidos: ServiceResponse[], notaId: string) {
    const capturas: (() => void)[] = [];

    function Probe({ pedidosProp }: { pedidosProp: ServiceResponse[] }) {
        capturas.push(useDestinoAposNota(pedidosProp, notaId, 'rota-1'));
        return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
        renderer = TestRenderer.create(<Probe pedidosProp={pedidos} />);
    });

    return {
        capturas,
        rerender: (novos: ServiceResponse[]) => {
            act(() => {
                renderer.update(<Probe pedidosProp={novos} />);
            });
        },
    };
}

describe('useDestinoAposNota — identidade estável', () => {
    beforeEach(() => {
        mockPush.mockClear();
        mockDismissTo.mockClear();
    });

    it('mantém a MESMA função quando a lista é recriada com o mesmo conteúdo (refetch)', () => {
        const pedidos = [nota({ id: 'a' }), nota({ id: 'b' })];
        const { capturas, rerender } = montar(pedidos, 'a');

        // O refetch devolve um array NOVO com o mesmo conteúdo — é exatamente o
        // que acontece na vida real a cada resposta da lista da rota.
        rerender([nota({ id: 'a' }), nota({ id: 'b' })]);

        expect(capturas.length).toBeGreaterThan(1);
        expect(capturas[capturas.length - 1]).toBe(capturas[0]);
    });

    it('mantém a MESMA função mesmo quando o conteúdo da lista muda', () => {
        const { capturas, rerender } = montar([nota({ id: 'a' }), nota({ id: 'b' })], 'a');

        rerender([nota({ id: 'a' }), nota({ id: 'b', isCompleted: true })]);

        expect(capturas[capturas.length - 1]).toBe(capturas[0]);
    });

    it('decide com o dado MAIS RECENTE, não com o do render em que foi criada', () => {
        // Na criação, a irmã 'b' ainda está por trabalhar → o destino seria o índice.
        const { capturas, rerender } = montar([nota({ id: 'a' }), nota({ id: 'b' })], 'a');

        // Depois ela fecha: agora não há outra nota por trabalhar → destino é a rota.
        rerender([nota({ id: 'a' }), nota({ id: 'b', isCompleted: true })]);

        capturas[0]();

        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockDismissTo).not.toHaveBeenCalled();
    });

    it('leva ao índice da parada quando ainda há irmã por trabalhar', () => {
        const { capturas } = montar([nota({ id: 'a' }), nota({ id: 'b' })], 'a');

        capturas[0]();

        expect(mockDismissTo).toHaveBeenCalledTimes(1);
        expect(mockPush).not.toHaveBeenCalled();
    });
});
