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

/**
 * Camada 2 — "uma parada por vez" com PARADA AGRUPADA.
 *
 * A regra existe para impedir o motorista de abrir duas PORTAS ao mesmo tempo.
 * Com o agrupamento, uma porta tem N notas: iniciar a nota 1 não pode bloquear
 * as notas 2..N da MESMA porta, senão a feature fica inutilizável com
 * `enforceSingleActiveStop` ligado (que é o padrão, opt-out).
 *
 * Irmão = pedido do MESMO GRUPO CONTÍGUO. Contiguidade, não só chave igual: em
 * rota legada dois pedidos do mesmo cliente podem estar separados por outra
 * parada no itinerário, e aí são duas portas de verdade.
 */
describe('useStopStatus — irmãos da mesma parada', () => {
    const MESMA_PORTA = { addressId: 'addr-1', customerId: 'cli-1', serviceType: 'DELIVERY' };
    const OUTRA_PORTA = { addressId: 'addr-9', customerId: 'cli-9', serviceType: 'DELIVERY' };

    it('irmão em atendimento NÃO bloqueia a próxima nota da mesma porta', () => {
        const nota1 = makeService({ id: 'n1', status: ServiceStatus.IN_ATTENDANCE, sequenceOrder: 1, isInAttendance: true, ...MESMA_PORTA });
        const nota2 = makeService({ id: 'n2', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true, ...MESMA_PORTA });

        const result = runHook({
            service: nota2,
            allServices: [nota1, nota2],
            currentServiceId: 'n2',
            enforceSingleActiveStop: true,
            enforceStopOrder: true,
        });

        expect(result.canStartService).toBe(true);
        expect(result.startBlockReason).toBeNull();
        expect(result.hasOtherServiceInProgress).toBe(false);
    });

    it('parada DE OUTRA PORTA em atendimento continua bloqueando', () => {
        const outra = makeService({ id: 'x1', status: ServiceStatus.IN_ATTENDANCE, sequenceOrder: 1, isInAttendance: true, ...OUTRA_PORTA });
        const nota = makeService({ id: 'n1', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true, ...MESMA_PORTA });

        const result = runHook({
            service: nota,
            allServices: [outra, nota],
            currentServiceId: 'n1',
            enforceSingleActiveStop: true,
            enforceStopOrder: true,
        });

        expect(result.canStartService).toBe(false);
        expect(result.startBlockReason).not.toBeNull();
    });

    it('ordem: qualquer nota da parada esperada pode ser iniciada, não só a primeira', () => {
        const nota1 = makeService({ id: 'n1', status: ServiceStatus.PENDING, sequenceOrder: 1, isPending: true, ...MESMA_PORTA });
        const nota2 = makeService({ id: 'n2', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true, ...MESMA_PORTA });

        const result = runHook({
            service: nota2,
            allServices: [nota1, nota2],
            currentServiceId: 'n2',
            enforceSingleActiveStop: true,
            enforceStopOrder: true,
        });

        expect(result.canStartService).toBe(true);
        expect(result.startBlockReason).toBeNull();
    });

    it('pular para OUTRA porta fora de ordem continua bloqueado', () => {
        const primeira = makeService({ id: 'p1', status: ServiceStatus.PENDING, sequenceOrder: 1, isPending: true, ...MESMA_PORTA });
        const adiante = makeService({ id: 'p9', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true, ...OUTRA_PORTA });

        const result = runHook({
            service: adiante,
            allServices: [primeira, adiante],
            currentServiceId: 'p9',
            enforceSingleActiveStop: true,
            enforceStopOrder: true,
        });

        expect(result.canStartService).toBe(false);
        expect(result.startBlockReason).toContain('ordem');
    });

    /**
     * O número do bloqueio ("Inicie a parada #N primeiro") é a ÚNICA orientação
     * que o motorista recebe no momento em que é travado. Ele vinha de
     * `sequenceOrder + 1`, que é posição de PEDIDO; os números na tela são de
     * PARADA (`mapGrupoToParada` → `numero = index + 1`). Numa rota agrupada os
     * dois divergem: com os dados do cliente a mensagem mandaria "inicie a parada
     * #34" numa lista que termina em 26.
     */
    it('o número citado no bloqueio é o da PARADA, não o sequenceOrder do pedido', () => {
        // Itinerário: porta A com 5 notas (seq 1..5, já concluídas), porta B com 2
        // notas (seq 6,7) e porta C (seq 8). A lista mostra 3 paradas.
        const portaA = [1, 2, 3, 4, 5].map((seq) =>
            makeService({ id: `a${seq}`, status: ServiceStatus.COMPLETED, sequenceOrder: seq, isCompleted: true, ...MESMA_PORTA }),
        );
        const portaB = [6, 7].map((seq) =>
            makeService({ id: `b${seq}`, status: ServiceStatus.PENDING, sequenceOrder: seq, isPending: true, ...OUTRA_PORTA }),
        );
        const portaC = makeService({
            id: 'c8', status: ServiceStatus.PENDING, sequenceOrder: 8, isPending: true,
            addressId: 'addr-3', customerId: 'cli-3', serviceType: 'DELIVERY',
        });
        const allServices = [...portaA, ...portaB, portaC];

        const result = runHook({
            service: portaC,
            allServices,
            currentServiceId: 'c8',
            enforceSingleActiveStop: true,
            enforceStopOrder: true,
        });

        expect(result.canStartService).toBe(false);
        // A próxima esperada é a porta B, que é a 2ª PARADA da rota.
        expect(result.startBlockReason).toContain('#2');
        // Antes citava o sequenceOrder + 1 do pedido (seq 6 → "#7"), um número que
        // não existe numa lista de 3 paradas.
        expect(result.startBlockReason).not.toContain('#7');
    });

    it('rota de 1 pedido por parada continua citando o mesmo número de antes', () => {
        const a = makeService({ id: 'a', status: ServiceStatus.PENDING, sequenceOrder: 0, isPending: true, ...MESMA_PORTA });
        const b = makeService({ id: 'b', status: ServiceStatus.PENDING, sequenceOrder: 1, isPending: true, ...OUTRA_PORTA });

        const result = runHook({
            service: b,
            allServices: [a, b],
            currentServiceId: 'b',
            enforceSingleActiveStop: true,
            enforceStopOrder: true,
        });

        expect(result.startBlockReason).toContain('#1');
    });

    it('rota legada: mesma porta NÃO contígua são duas paradas — e uma bloqueia a outra', () => {
        // Itinerário: porta A (seq 1) → porta B (seq 2) → porta A de novo (seq 3).
        // O otimizador separou; o app respeita. 'a1' em atendimento bloqueia 'a2'.
        const a1 = makeService({ id: 'a1', status: ServiceStatus.IN_ATTENDANCE, sequenceOrder: 1, isInAttendance: true, ...MESMA_PORTA });
        const b1 = makeService({ id: 'b1', status: ServiceStatus.PENDING, sequenceOrder: 2, isPending: true, ...OUTRA_PORTA });
        const a2 = makeService({ id: 'a2', status: ServiceStatus.PENDING, sequenceOrder: 3, isPending: true, ...MESMA_PORTA });

        const result = runHook({
            service: a2,
            allServices: [a1, b1, a2],
            currentServiceId: 'a2',
            enforceSingleActiveStop: true,
            enforceStopOrder: true,
        });

        expect(result.canStartService).toBe(false);
        expect(result.hasOtherServiceInProgress).toBe(true);
    });
});
