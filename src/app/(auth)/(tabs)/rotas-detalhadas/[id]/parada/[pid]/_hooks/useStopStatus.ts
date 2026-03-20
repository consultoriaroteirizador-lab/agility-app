import { useMemo } from 'react';

import { ServiceStatus } from '@/domain/agility/service/dto/types';

import { StopStatus } from '../_types/stop.types';

interface Service {
    id: string;
    status: ServiceStatus;
    isPending?: boolean;
    isInProgress?: boolean;
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
        const isInProgress = service?.isInProgress === true;
        const isCompleted = service?.isCompleted === true;
        const isCanceled = service?.isCanceled === true;

        // Check if there's another service in progress (different from current)
        const hasOtherServiceInProgress = allServices.some(
            (s) =>
                s.id !== currentServiceId &&
                (s.isInProgress === true || s.status === ServiceStatus.IN_PROGRESS),
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
            isCompleted,
            isCanceled,
            canStartService,
            isNextStop,
            hasOtherServiceInProgress,
            canCompleteRouting,
        };
    }, [service, allServices, currentServiceId]);
};
