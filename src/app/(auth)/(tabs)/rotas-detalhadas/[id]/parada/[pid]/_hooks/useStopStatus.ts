import { useMemo } from 'react';

import { ServiceStatus } from '@/domain/agility/service/dto/types';

import { StopStatus } from '../_types/stop.types';

interface Service {
    id: string;
    status: ServiceStatus;
    isPending?: boolean;
    isInProgress?: boolean;
    isInAttendance?: boolean;
    isCompleted?: boolean;
    isCanceled?: boolean;
    isFailed?: boolean;
}

interface UseStopStatusParams {
    service: Service | null;
    allServices: Service[];
    currentServiceId: string;
}

/**
 * Hook to calculate and manage stop/service status
 * Uses ONLY boolean fields from backend as source of truth
 */
export const useStopStatus = ({
    service,
    allServices,
    currentServiceId,
}: UseStopStatusParams): StopStatus => {
    return useMemo(() => {
        // Default values
        const isPending = service?.isPending === true;
        const isInProgress = service?.isInProgress === true; // a caminho
        const isInAttendance = service?.isInAttendance === true || service?.status === ServiceStatus.IN_ATTENDANCE; // atendendo
        const isCompleted = service?.isCompleted === true;
        const isCanceled = service?.isCanceled === true;

        // Outra parada em execução (a caminho OU em atendimento), diferente da atual
        const hasOtherServiceInProgress = allServices.some(
            (s) =>
                s.id !== currentServiceId &&
                (s.isInProgress === true ||
                    s.isInAttendance === true ||
                    s.status === ServiceStatus.IN_PROGRESS ||
                    s.status === ServiceStatus.IN_ATTENDANCE),
        );

        // Business rule: Cannot start if another service is in progress
        const canStartService = isPending && !hasOtherServiceInProgress;

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
        };
    }, [service, allServices, currentServiceId]);
};
