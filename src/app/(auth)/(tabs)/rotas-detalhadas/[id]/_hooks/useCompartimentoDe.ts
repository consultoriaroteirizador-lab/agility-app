import { useCallback } from 'react';

import { useFindOneRouting } from '@/domain/agility/routing/useCase';

import { formatCompartimento, totalCompartimentos } from '../_utils/compartimento';

/**
 * Onde a linha do pedido vai no veículo (plano de carga da rota, fase 5C).
 * Lê a MESMA query de `useFindOneRouting` (cache; sem request extra), então serve a telas fora do
 * `RotaProvider`. `loadPlan` e `totalComp` são lidos no corpo e listados nas dependências: o React
 * Compiler descartaria o que só fosse lido dentro da closure e o app mostraria o plano velho.
 */
export function useCompartimentoDe(routeId: string | null | undefined): (lineId: string) => string | null {
    const { routing } = useFindOneRouting(routeId ?? '');
    const loadPlan = routing?.loadPlan;
    const totalComp = totalCompartimentos(routing);
    return useCallback(
        (lineId: string) => formatCompartimento(loadPlan?.find((e) => e.orderItemId === lineId), totalComp),
        [loadPlan, totalComp],
    );
}
