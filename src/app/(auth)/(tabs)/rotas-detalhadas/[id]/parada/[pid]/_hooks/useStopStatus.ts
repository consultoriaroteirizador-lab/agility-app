import { useMemo } from 'react';

import { ServiceStatus } from '@/domain/agility/service/dto/types';

import { getParadasOrdenadas } from '../../../_utils/routeCalculations';
import { findGrupoDoServico, groupContiguousStops } from '../../../_utils/stopGrouping';
import { StopStatus } from '../_types/stop.types';

interface Service {
    id: string;
    status: ServiceStatus;
    sequenceOrder?: number | null;
    isPending?: boolean;
    isInProgress?: boolean;
    isInAttendance?: boolean;
    isCompleted?: boolean;
    isCanceled?: boolean;
    isFailed?: boolean;
    // Identificam a PARADA (a porta), não o pedido. Opcionais: um caller que não
    // os passe cai no comportamento antigo (cada pedido é a sua própria parada).
    addressId?: string | null;
    customerId?: string | null;
    fantasyName?: string | null;
    responsible?: string | null;
    serviceType?: string | null;
}

interface UseStopStatusParams {
    service: Service | null;
    allServices: Service[];
    currentServiceId: string;
    /** Empresa exige uma parada por vez (a caminho OU em atendimento). */
    enforceSingleActiveStop?: boolean;
    /** Empresa exige iniciar as paradas na ordem do roteirizador. */
    enforceStopOrder?: boolean;
}

const TERMINAL_STATUSES = [
    ServiceStatus.COMPLETED,
    ServiceStatus.CANCELED,
    ServiceStatus.FAILED,
];

function isTerminal(s: Service): boolean {
    return (
        s.isCompleted === true ||
        s.isCanceled === true ||
        s.isFailed === true ||
        TERMINAL_STATUSES.includes(s.status)
    );
}

/**
 * Hook to calculate and manage stop/service status.
 * Uses boolean fields from backend as source of truth and applies the
 * company-configurable rules (single active stop / mandatory order) when enabled.
 * O backend continua sendo a fonte de verdade — aqui é apenas gating de UX.
 */
export const useStopStatus = ({
    service,
    allServices,
    currentServiceId,
    // Opt-out — mesma semântica do backend e de `resolveCompanyRules` (Task 5):
    // ligadas por padrão, só desligam com `false` explícito. Os 2 call sites
    // atuais (index.tsx e ParadaContext) sempre passam esses valores, mas o
    // default aqui é a última linha de defesa contra um caller futuro que
    // esqueça de passar — sem isso, "esqueceu" vira "regra desligada" de novo,
    // um nível abaixo do que a Task 5 corrigiu.
    enforceSingleActiveStop = true,
    enforceStopOrder = true,
}: UseStopStatusParams): StopStatus => {
    return useMemo(() => {
        // Default values
        const isPending = service?.isPending === true;
        const isInProgress = service?.isInProgress === true; // a caminho
        const isInAttendance = service?.isInAttendance === true || service?.status === ServiceStatus.IN_ATTENDANCE; // atendendo
        const isCompleted = service?.isCompleted === true;
        const isCanceled = service?.isCanceled === true;

        // Irmãos = pedidos da MESMA PARADA (mesmo grupo contíguo). Com a Camada 2
        // uma porta tem N notas; iniciar a nota 1 não pode contar como "outra
        // parada em andamento" para as notas 2..N, senão a regra "uma por vez"
        // trava o motorista na primeira nota. Usa o MESMO comparador
        // (`getParadasOrdenadas`) que a tela do índice de notas usa — duas
        // cópias inline já divergiram no fallback de sequenceOrder (999 vs
        // Number.MAX_SAFE_INTEGER); se divergirem de novo, o gate bloqueia algo
        // que a tela mostra como uma parada só, e o motorista não tem como
        // entender.
        const ordenados = getParadasOrdenadas(allServices);
        const grupoAtual = findGrupoDoServico(groupContiguousStops(ordenados), currentServiceId);
        // Sem grupo (serviço ainda não carregado na lista da rota) → só ele mesmo,
        // que é exatamente o comportamento anterior à Camada 2.
        const irmaosIds = new Set<string>(
            grupoAtual ? grupoAtual.map((s) => s.id) : [currentServiceId],
        );

        // Outra PARADA em execução (a caminho OU em atendimento) — irmãos não contam.
        const hasOtherServiceInProgress = allServices.some(
            (s) =>
                !irmaosIds.has(s.id) &&
                (s.isInProgress === true ||
                    s.isInAttendance === true ||
                    s.status === ServiceStatus.IN_PROGRESS ||
                    s.status === ServiceStatus.IN_ATTENDANCE),
        );

        // Próxima parada esperada na ordem: menor sequenceOrder entre as não-terminais.
        const nextExpected = [...allServices]
            .filter((s) => !isTerminal(s))
            .sort((a, b) => (a.sequenceOrder ?? Number.MAX_SAFE_INTEGER) - (b.sequenceOrder ?? Number.MAX_SAFE_INTEGER))[0];
        // "Próxima esperada" é a próxima PARADA: qualquer nota dela serve para
        // iniciar. `irmaosIds` sempre contém o serviço atual, então isto também
        // cobre o caso de 1 pedido por parada.
        const isNextInOrder = !nextExpected || irmaosIds.has(nextExpected.id);

        // "Uma por vez" IMPLICA "seguir ordem": sem isso, a combinação
        // (uma-por-vez ON + ordem OFF) vira armadilha — o motorista inicia uma
        // parada fora de ordem, trava as demais (uma por vez) e não tem como
        // desfazer. Amarrar ordem ao single-active fecha essa brecha.
        const orderEnforced = enforceStopOrder || enforceSingleActiveStop;

        // Regras configuráveis: monta o motivo do bloqueio (null = pode iniciar).
        let startBlockReason: string | null = null;
        if (orderEnforced && !isNextInOrder) {
            const pos = (nextExpected?.sequenceOrder ?? 0) + 1;
            startBlockReason = `Você deve seguir a ordem das paradas. Inicie a parada #${pos} primeiro.`;
        } else if (enforceSingleActiveStop && hasOtherServiceInProgress) {
            startBlockReason = 'Conclua a parada em andamento antes de iniciar outra.';
        }

        // Business rule: Cannot start if pending is false OR if a configurable rule blocks it.
        const canStartService = isPending && startBlockReason === null;

        // Check if this is the next stop (pending or assigned)
        const isNextStop = isPending;

        // Check if ALL services are completed (success or failure)
        const canCompleteRouting = allServices.length > 0 && allServices.every(
            (s) => s.isCompleted === true || s.isCanceled === true || s.isFailed === true
        );

        return {
            isPending,
            isInProgress,
            isInAttendance,
            isCompleted,
            isCanceled,
            canStartService,
            isNextStop,
            hasOtherServiceInProgress,
            canCompleteRouting,
            startBlockReason,
        };
    }, [service, allServices, currentServiceId, enforceSingleActiveStop, enforceStopOrder]);
};
