import type { RoutingResponse } from '@/domain/agility/routing/dto';

import { formatCompartimento, totalCompartimentos } from '../compartimento';

describe('formatCompartimento', () => {
    it('com carreta e compartimento 2', () => {
        expect(formatCompartimento({ trailerPlate: 'CRT5E01', compartment: 2 }, 3)).toBe('Carreta CRT5E01 · compartimento 2');
    });

    it('rígido de 2 compartimentos', () => {
        expect(formatCompartimento({ trailerPlate: null, compartment: 1 }, 2)).toBe('Compartimento 1');
    });

    it('compartment null: qualquer compartimento', () => {
        expect(formatCompartimento({ trailerPlate: null, compartment: null }, 2)).toBe('Qualquer compartimento');
    });

    it('total 1 ou sem entrada: null', () => {
        expect(formatCompartimento({ trailerPlate: null, compartment: 1 }, 1)).toBeNull();
        expect(formatCompartimento({ trailerPlate: 'CRT5E01', compartment: 1 }, 0)).toBeNull();
        expect(formatCompartimento(undefined, 3)).toBeNull();
    });
});

describe('totalCompartimentos', () => {
    const rota = (over: Partial<RoutingResponse>) => over as RoutingResponse;

    it('com carretas soma os compartimentos delas (ausente conta 1)', () => {
        const r = rota({
            vehicle: { compartments: null },
            trailers: [
                { position: 1, plate: 'A', compartments: 2 },
                { position: 2, plate: 'B' },
            ],
        });
        expect(totalCompartimentos(r)).toBe(3);
    });

    it('sem carretas usa os do veículo', () => {
        expect(totalCompartimentos(rota({ vehicle: { compartments: 2 }, trailers: [] }))).toBe(2);
    });

    it('sem veículo, sem dado ou rota nula: 1', () => {
        expect(totalCompartimentos(rota({}))).toBe(1);
        expect(totalCompartimentos(rota({ vehicle: { compartments: null } }))).toBe(1);
        expect(totalCompartimentos(null)).toBe(1);
    });
});
