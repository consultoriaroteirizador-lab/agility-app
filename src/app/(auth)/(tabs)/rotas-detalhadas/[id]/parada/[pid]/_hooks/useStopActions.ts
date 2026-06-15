import { useCallback, useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { FailureReason } from '@/domain/agility/service/dto';
import { ServiceStatus } from '@/domain/agility/service/dto/types';
import {
    useCompleteService,
    useFailService,
    useStartService,
    useStartAttendance,
} from '@/domain/agility/service/useCase';
import { KEY_SERVICES } from '@/domain/queryKeys';
import { useToastService } from '@/services/Toast/useToast';

import { getCurrentCoords } from './getCurrentCoords';

interface UseStopActionsParams {
    serviceId: string;
    routeId: string;
    serviceStatus?: ServiceStatus;
    isServiceInProgress?: boolean;
    serviceStartDate?: string | null;
    onSuccess?: () => void;
}

interface UseStopActionsReturn {
    handleStartService: () => void;
    handleGoToLocation: () => void;
    handleStartAttendance: () => void;
    handleCompleteService: () => void;
    handleMarkAsFailed: () => void;
    isStarting: boolean;
    isStartingAttendance: boolean;
    isCompleting: boolean;
    isFailing: boolean;
}

/**
 * Hook to manage stop/service actions (start, complete, fail)
 */
export const useStopActions = ({
    serviceId,
    routeId,
    serviceStatus,
    isServiceInProgress,
    serviceStartDate,
    onSuccess,
}: UseStopActionsParams): UseStopActionsReturn => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToastService();

    const invalidateQueries = useCallback(() => {
        // Dispara o refetch em background e NÃO aguarda: a UI desbloqueia na hora.
        // O React Query atualiza a tela do serviço e a lista da rota quando o refetch
        // retornar. Antes isso era awaited e travava o spinner até a rota inteira voltar.
        void queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] });
        void queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', routeId] });
    }, [queryClient, serviceId, routeId]);

    // Loading "estendido": a mutation resolve rápido, mas o status só reflete na UI
    // após o refetch (pode levar alguns segundos). Sem isso, o botão volta a ficar
    // clicável nesse intervalo. Mantemos pendente do clique até o backend confirmar
    // o novo status (via prop serviceStatus que atualiza no refetch) ou erro.
    const [pendingStart, setPendingStart] = useState(false);
    const [pendingAttendance, setPendingAttendance] = useState(false);

    useEffect(() => {
        // Confirmou "a caminho" (ou já avançou) → limpa pendência do start.
        if (serviceStatus && serviceStatus !== ServiceStatus.PENDING && serviceStatus !== ServiceStatus.ASSIGNED) {
            setPendingStart(false);
        }
        // Confirmou "em atendimento" (ou terminal) → limpa pendência do atendimento.
        if (
            serviceStatus === ServiceStatus.IN_ATTENDANCE ||
            serviceStatus === ServiceStatus.COMPLETED ||
            serviceStatus === ServiceStatus.FAILED ||
            serviceStatus === ServiceStatus.CANCELED
        ) {
            setPendingAttendance(false);
        }
    }, [serviceStatus]);

    const { startService, isLoading: isStarting } = useStartService({
        onSuccess: async () => {
            await invalidateQueries();
            onSuccess?.();
        },
        onError: (error: any) => {
            // If service was already started, treat as success and continue
            const errorMessage = error?.error?.message || error?.message || ''
            if (
                errorMessage.includes('already been started') ||
                errorMessage.includes('já foi iniciado') ||
                errorMessage.includes('already been') ||
                error?.error?.code === 'INTERNAL_ERROR'
            ) {
                console.log('[useStopActions] Service already started, continuing...')
                invalidateQueries();
                onSuccess?.()
                return
            }
            console.error('Error starting service:', error)
            setPendingStart(false)
            showToast({ message: 'Não foi possível iniciar o serviço. Tente novamente.', type: 'error' })
        },
    })

    const { startAttendance, isLoading: isStartingAttendance } = useStartAttendance({
        onSuccess: async () => {
            await invalidateQueries();
            onSuccess?.();
        },
        onError: (error: any) => {
            // Se já estava em atendimento, trata como sucesso e segue
            const errorMessage = error?.error?.message || error?.message || ''
            if (
                errorMessage.includes('em atendimento') ||
                errorMessage.includes('IN_ATTENDANCE') ||
                error?.error?.code === 'INTERNAL_ERROR'
            ) {
                invalidateQueries();
                onSuccess?.()
                return
            }
            console.error('Error starting attendance:', error)
            setPendingAttendance(false)
            showToast({ message: 'Não foi possível iniciar o atendimento. Tente novamente.', type: 'error' })
        },
    })

    const { completeService, isLoading: isCompleting } = useCompleteService({
        onSuccess: async () => {
            await invalidateQueries();
            setTimeout(() => router.back(), 500);
        },
        onError: (error) => {
            console.error('Error completing service:', error);
            showToast({ message: 'Não foi possível concluir o serviço. Tente novamente.', type: 'error' });
        },
    });

    const { failService, isLoading: isFailing } = useFailService({
        onSuccess: async () => {
            await invalidateQueries();
            await queryClient.refetchQueries({ queryKey: [KEY_SERVICES, 'routing', routeId] });
            setTimeout(() => router.back(), 500);
        },
        onError: (error) => {
            console.error('Error marking service as failed:', error);
            showToast({ message: 'Não foi possível marcar o serviço como insucesso. Tente novamente.', type: 'error' });
        },
    });

    const handleStartService = useCallback(() => {
        setPendingStart(true);
        startService(serviceId);
    }, [startService, serviceId]);

    const handleGoToLocation = useCallback(() => {
        // Check if service is already in progress
        if (
            isServiceInProgress === true ||
            serviceStatus === ServiceStatus.IN_PROGRESS ||
            serviceStartDate
        ) {
            invalidateQueries();
            return;
        }

        // Validate if status allows starting
        if (
            serviceStatus !== ServiceStatus.PENDING &&
            serviceStatus !== ServiceStatus.ASSIGNED
        ) {
            showToast({ message: `Não é possível iniciar o serviço. Status atual: ${serviceStatus || 'desconhecido'}`, type: 'error' });
            return;
        }

        setPendingStart(true);
        startService(serviceId);
    }, [
        isServiceInProgress,
        serviceStatus,
        serviceStartDate,
        startService,
        serviceId,
        invalidateQueries,
    ]);

    const handleStartAttendance = useCallback(async () => {
        // Bloqueia só estados terminais; backend aceita PENDING/ASSIGNED/IN_PROGRESS → IN_ATTENDANCE.
        if (
            serviceStatus === ServiceStatus.COMPLETED ||
            serviceStatus === ServiceStatus.CANCELED ||
            serviceStatus === ServiceStatus.FAILED
        ) {
            showToast({ message: `Não é possível iniciar o atendimento. Status atual: ${serviceStatus}`, type: 'error' });
            return;
        }
        // Já em atendimento → apenas garante refetch
        if (serviceStatus === ServiceStatus.IN_ATTENDANCE) {
            invalidateQueries();
            onSuccess?.();
            return;
        }
        // Marca pendência ANTES de capturar GPS — o botão já entra em loading no clique,
        // mesmo durante a captura de localização (até alguns segundos).
        setPendingAttendance(true);
        // Captura a referência de GPS de onde o motorista iniciou o atendimento (best-effort).
        const location = await getCurrentCoords();
        startAttendance({ id: serviceId, location });
    }, [serviceStatus, startAttendance, serviceId, invalidateQueries, onSuccess, showToast]);

    const handleCompleteService = useCallback(() => {
        completeService({ id: serviceId });
    }, [completeService, serviceId]);

    const handleMarkAsFailed = useCallback(() => {
        failService({
            id: serviceId,
            payload: {
                reason: FailureReason.OTHER,
                notes: `Failure registered for service ${serviceId}`,
            },
        });
    }, [failService, serviceId]);

    return {
        handleStartService,
        handleGoToLocation,
        handleStartAttendance,
        handleCompleteService,
        handleMarkAsFailed,
        // Loading estendido: cobre do clique até o backend confirmar o novo status.
        isStarting: isStarting || pendingStart,
        isStartingAttendance: isStartingAttendance || pendingAttendance,
        isCompleting,
        isFailing,
    };
};
