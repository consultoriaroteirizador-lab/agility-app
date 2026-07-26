/**
 * A regra opt-out (Task 5) foi corrigida em `resolveCompanyRules`, mas o hook
 * usado por ambos os call sites ainda tinha `enforceSingleActiveStop = false`
 * e `enforceStopOrder = false` como default de parâmetro. Hoje isso é
 * inofensivo (os 2 call sites sempre passam os valores explicitamente), mas
 * um terceiro caller que esqueça de passar essas props reintroduz a falha
 * aberta em silêncio — o TypeScript não avisa porque os campos são opcionais.
 *
 * Este teste prova que, SEM passar enforceSingleActiveStop/enforceStopOrder,
 * o hook se comporta como se as regras estivessem LIGADAS (opt-out), igual
 * ao backend e igual a `resolveCompanyRules`.
 */
import React from 'react';

import TestRenderer, { act } from 'react-test-renderer';

import { ServiceStatus } from '@/domain/agility/service/dto/types';

import { useStopStatus } from '../useStopStatus';

type ServiceInput = Parameters<typeof useStopStatus>[0]['allServices'][number];

function makeService(over: Partial<ServiceInput> & { id: string; status: ServiceStatus }): ServiceInput {
    return {
        isPending: false,
        isInProgress: false,
        isInAttendance: false,
        isCompleted: false,
        isCanceled: false,
        isFailed: false,
        ...over,
    };
}

/** Roda o hook fora de um componente "de verdade", capturando o resultado do render. */
function runHook(params: Parameters<typeof useStopStatus>[0]) {
    let captured: ReturnType<typeof useStopStatus> | undefined;
    function Probe() {
        captured = useStopStatus(params);
        return null;
    }
    act(() => {
        TestRenderer.create(<Probe />);
    });
    if (!captured) throw new Error('useStopStatus não retornou nada');
    return captured;
}

describe('useStopStatus — defaults de enforceSingleActiveStop/enforceStopOrder', () => {
    it('bloqueia início fora de ordem MESMO sem passar as flags (opt-out por padrão)', () => {
        // Parada 'b' é a atual, mas 'a' (sequenceOrder menor) ainda está pendente:
        // fora de ordem. Sem passar enforceStopOrder/enforceSingleActiveStop.
        const a = makeService({ id: 'a', status: ServiceStatus.PENDING, sequenceOrder: 1, isPending: true });
        const b = makeService({ id: 'b', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true });

        const result = runHook({
            service: b,
            allServices: [a, b],
            currentServiceId: 'b',
        });

        expect(result.canStartService).toBe(false);
        expect(result.startBlockReason).not.toBeNull();
    });

    it('bloqueia início com outra parada em andamento MESMO sem passar as flags (opt-out por padrão)', () => {
        // 'a' já está em atendimento; 'b' é a atual e está pendente e na ordem certa
        // (sequenceOrder mais baixo entre as não-terminais é o dela mesma).
        const a = makeService({ id: 'a', status: ServiceStatus.IN_ATTENDANCE, sequenceOrder: 1, isInAttendance: true });
        const b = makeService({ id: 'b', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true });

        const result = runHook({
            service: b,
            allServices: [a, b],
            currentServiceId: 'b',
        });

        expect(result.canStartService).toBe(false);
        expect(result.startBlockReason).not.toBeNull();
    });

    it('respeita o desligamento EXPLÍCITO das duas regras (false, false)', () => {
        const a = makeService({ id: 'a', status: ServiceStatus.IN_ATTENDANCE, sequenceOrder: 1, isInAttendance: true });
        const b = makeService({ id: 'b', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true });

        const result = runHook({
            service: b,
            allServices: [a, b],
            currentServiceId: 'b',
            enforceSingleActiveStop: false,
            enforceStopOrder: false,
        });

        expect(result.canStartService).toBe(true);
        expect(result.startBlockReason).toBeNull();
    });
});
