// src/domain/agility/wallet/__tests__/freightEarnings.test.ts
/**
 * Frete liberado = FREIGHT_RELEASE da parcela − estorno da MESMA parcela (espelho de
 * back/src/wallet/ledger/ledger-summary.ts). Todas as linhas de frete trazem
 * `sourceId` = id da parcela (freight-share-admin.service.ts:267).
 */
import { groupReleasedFreight, totalReleasedCents } from '../freightEarnings';

type Line = Parameters<typeof groupReleasedFreight>[0][number];

function linha(over: Partial<Line> & { id: string }): Line {
    return {
        type: 'FREIGHT_RELEASE',
        direction: 'IN',
        status: 'COMPLETED',
        amount: 10000,
        sourceType: 'FREIGHT_SHARE_RELEASE',
        sourceId: 'share-1',
        description: 'Frete liberado - roteirização LMR-260920-A1',
        createdAt: '2026-09-20T15:00:00.000Z',
        ...over,
    } as Line;
}

const estorno = (over: Partial<Line> & { id: string }) =>
    linha({ type: 'MANUAL_DEBIT' as Line['type'], direction: 'OUT', sourceType: 'FREIGHT_SHARE_REVERSAL', description: 'Estorno de frete', ...over });

describe('groupReleasedFreight', () => {
    it('liberação integral conta o valor liberado', () => {
        const itens = groupReleasedFreight([linha({ id: 'r1' })]);
        expect(itens).toEqual([
            { shareId: 'share-1', description: 'Frete liberado - roteirização LMR-260920-A1', releasedCents: 10000, releasedAt: '2026-09-20T15:00:00.000Z' },
        ]);
    });

    it('liberou menos que o bloqueado: desconta o estorno da mesma parcela', () => {
        const itens = groupReleasedFreight([linha({ id: 'r1' }), estorno({ id: 'e1', amount: 2500 })]);
        expect(itens[0].releasedCents).toBe(7500);
    });

    it('parcela CANCELADA (liberação + estorno total no mesmo gesto) não conta nem aparece', () => {
        const itens = groupReleasedFreight([
            linha({ id: 'r1', description: 'Frete desbloqueado para cancelamento - roteirização X' }),
            estorno({ id: 'e1', amount: 10000 }),
            linha({ id: 'r2', sourceId: 'share-2', amount: 4000 }),
        ]);
        expect(itens.map((i) => i.shareId)).toEqual(['share-2']);
        expect(totalReleasedCents(itens)).toBe(4000);
    });

    it('liberação de recebível legado (antes da F2) fica fora', () => {
        expect(groupReleasedFreight([linha({ id: 'r1', sourceType: 'LEGACY_RECEIVABLE_RELEASE' })])).toEqual([]);
    });

    it('linha que não está COMPLETED não conta', () => {
        expect(groupReleasedFreight([linha({ id: 'r1', status: 'PENDING' as Line['status'] })])).toEqual([]);
    });

    it('débito manual comum (origem MANUAL) não é estorno de frete', () => {
        const itens = groupReleasedFreight([linha({ id: 'r1' }), estorno({ id: 'e1', amount: 3000, sourceType: 'MANUAL', sourceId: 'share-1' })]);
        expect(itens[0].releasedCents).toBe(10000);
    });

    it('a mesma linha vinda em duas páginas conta uma vez', () => {
        expect(totalReleasedCents(groupReleasedFreight([linha({ id: 'r1' }), linha({ id: 'r1' })]))).toBe(10000);
    });

    it('mais recente primeiro', () => {
        const itens = groupReleasedFreight([
            linha({ id: 'r1', sourceId: 'a', createdAt: '2026-09-01T10:00:00.000Z' }),
            linha({ id: 'r2', sourceId: 'b', createdAt: '2026-09-15T10:00:00.000Z' }),
        ]);
        expect(itens.map((i) => i.shareId)).toEqual(['b', 'a']);
    });
});
