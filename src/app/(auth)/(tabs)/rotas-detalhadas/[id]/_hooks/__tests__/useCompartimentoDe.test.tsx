/**
 * Hook único do compartimento da linha. Prova, em especial, que o callback troca quando o
 * `loadPlan` muda (React Compiler não pode memoizar sem essa dependência).
 */
import React from 'react';

import TestRenderer, { act } from 'react-test-renderer';

import { useCompartimentoDe } from '../useCompartimentoDe';

const mockUseFindOneRouting = jest.fn();
jest.mock('@/domain/agility/routing/useCase', () => ({
    useFindOneRouting: (...args: unknown[]) => mockUseFindOneRouting(...args),
}));

type Routing = Record<string, unknown>;
function mockRouting(routing: Routing | null) {
    mockUseFindOneRouting.mockReturnValue({ routing });
}

function render(routeId: string | null | undefined) {
    const ref: { current: ReturnType<typeof useCompartimentoDe> | null } = { current: null };
    function Probe({ id }: { id: string | null | undefined }) {
        ref.current = useCompartimentoDe(id);
        return null;
    }
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
        renderer = TestRenderer.create(<Probe id={routeId} />);
    });
    const rerender = () =>
        act(() => {
            renderer.update(<Probe id={routeId} />);
        });
    return { ref, rerender };
}

describe('useCompartimentoDe', () => {
    beforeEach(() => mockUseFindOneRouting.mockReset());

    it('devolve "Carreta CRT5E01 · compartimento 2" com carreta e 3 compartimentos', () => {
        mockRouting({
            trailers: [{ compartments: 3 }],
            loadPlan: [{ orderItemId: 'l1', trailerPlate: 'CRT5E01', compartment: 2 }],
        });
        const { ref } = render('r1');
        expect(ref.current!('l1')).toBe('Carreta CRT5E01 · compartimento 2');
    });

    it('devolve null com 1 compartimento ou sem entrada no plano', () => {
        mockRouting({ vehicle: { compartments: 1 }, loadPlan: [{ orderItemId: 'l1', trailerPlate: null, compartment: 1 }] });
        expect(render('r1').ref.current!('l1')).toBeNull();
        mockRouting({ vehicle: { compartments: 3 }, loadPlan: [{ orderItemId: 'l1', trailerPlate: null, compartment: 1 }] });
        expect(render('r1').ref.current!('outra')).toBeNull();
    });

    it('routeId nulo não quebra e devolve null', () => {
        mockRouting(null);
        expect(render(null).ref.current!('l1')).toBeNull();
        expect(mockUseFindOneRouting).toHaveBeenCalledWith('');
    });

    it('o callback troca quando o loadPlan muda', () => {
        mockRouting({ vehicle: { compartments: 3 }, loadPlan: [{ orderItemId: 'l1', trailerPlate: null, compartment: 1 }] });
        const { ref, rerender } = render('r1');
        const antes = ref.current!('l1');
        mockRouting({ vehicle: { compartments: 3 }, loadPlan: [{ orderItemId: 'l1', trailerPlate: null, compartment: 2 }] });
        rerender();
        expect([antes, ref.current!('l1')]).toEqual(['Compartimento 1', 'Compartimento 2']);
    });
});
