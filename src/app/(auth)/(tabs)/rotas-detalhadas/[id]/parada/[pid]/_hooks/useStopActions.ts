import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { FailureReason } from '@/domain/agility/service/dto';
import { ServiceStatus } from '@/domain/agility/service/dto/types';
import {
    useCompleteService,
    useFailService,
    useStartService,
} from '@/domain/agility/service/useCase';
import { KEY_SERVICES } from '@/domain/queryKeys';
import { useToastService } from '@/services/Toast/useToast';

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
    handleCompleteService: () => void;
    handleMarkAsFailed: () => void;
    isStarting: boolean;
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

    const invalidateQueries = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] });
        await queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', routeId] });
    }, [queryClient, serviceId, routeId]);

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
            showToast({ message: 'Não foi possível iniciar o serviço. Tente novamente.', type: 'error' })
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

        startService(serviceId);
    }, [
        isServiceInProgress,
        serviceStatus,
        serviceStartDate,
        startService,
        serviceId,
        invalidateQueries,
    ]);

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
        handleCompleteService,
        handleMarkAsFailed,
        isStarting,
        isCompleting,
        isFailing,
    };
};
