import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'expo-router';

import { useUpdateDriver } from '@/domain/agility/driver/useCase';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';
import { useFindMyRoutings, useStartRouting } from '@/domain/agility/routing/useCase';
import { useAuthCredentialsService } from '@/services';
import { useLocationTracking } from '@/services/location/locationService';

import { useRoutesModals } from './useRoutesModals';

function useDriverAvailability() {
    const { userAuth } = useAuthCredentialsService();
    const driverId = userAuth?.driverId || null;
    const [isAvailable, setIsAvailable] = useState(false);
    const hasInitializedRef = useRef(false);

    const { updateDriver, isLoading: isUpdatingAvailability } = useUpdateDriver({
        onSuccess: () => {
            setIsAvailable((prev) => prev);
        },
        onError: (error) => {
            console.error('[useDriverAvailability] Error updating availability:', error);
        },
    });

    // Force offline ONCE when driverId becomes available
    useEffect(() => {
        if (hasInitializedRef.current || !driverId) {
            return;
        }

        hasInitializedRef.current = true;
        updateDriver({
            id: driverId,
            payload: { isAvailable: false },
        });
    }, [driverId, updateDriver]);

    const toggleAvailability = useCallback(
        async (newValue: boolean) => {
            if (!driverId || isUpdatingAvailability) return false;

            setIsAvailable(newValue);
            updateDriver({
                id: driverId,
                payload: { isAvailable: newValue },
            });

            return true;
        },
        [driverId, isUpdatingAvailability, updateDriver]
    );

    return {
        driverId,
        isAvailable,
        isUpdatingAvailability,
        toggleAvailability,
        setIsAvailable,
    };
}

function useRoutesList() {
    const { routings, isLoading, isError, refetch } = useFindMyRoutings();
    const [refreshing, setRefreshing] = useState(false);

    const filteredRoutes = routings
        .filter(
            (r) => r.status === RoutingStatus.ASSIGNED || r.status === RoutingStatus.IN_PROGRESS
        )
        .sort((a, b) => {
            if (a.status === RoutingStatus.IN_PROGRESS && b.status !== RoutingStatus.IN_PROGRESS) {
                return -1;
            }
            if (a.status !== RoutingStatus.IN_PROGRESS && b.status === RoutingStatus.IN_PROGRESS) {
                return 1;
            }
            return 0;
        });

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    return {
        routes: filteredRoutes,
        isLoading,
        isError,
        refreshing,
        onRefresh,
        refetch,
    };
}

export function useRoutesScreen() {
    const router = useRouter();

    const {
        driverId,
        isAvailable,
        isUpdatingAvailability,
        toggleAvailability,
        setIsAvailable,
    } = useDriverAvailability();

    const { startTracking, stopTracking } = useLocationTracking(driverId);

    const { routes, isLoading, isError, refreshing, onRefresh, refetch } = useRoutesList();

    const {
        startRoutePopup,
        routeAlreadyStartedPopup,
        unavailablePopup,
        selectedRoute,
        openStartRoutePopup,
        closeStartRoutePopup,
        closeRouteAlreadyStartedPopup,
        closeUnavailablePopup,
        setSelectedRoute,
    } = useRoutesModals(routes, isAvailable);

    const { startRouting, isLoading: isStartingRoute } = useStartRouting({
        onSuccess: () => {
            refetch();
            closeStartRoutePopup();
            if (selectedRoute) {
                setTimeout(() => {
                    router.push(`/(auth)/(tabs)/rotas-detalhadas/${selectedRoute}`);
                }, 300);
            }
        },
        onError: (error) => {
            console.error('[useRoutesScreen] Error starting route:', error);
            closeStartRoutePopup();
        },
    });

    const handleToggleAvailability = useCallback(async () => {
        if (!driverId || isUpdatingAvailability) return;

        const newAvailability = !isAvailable;
        setIsAvailable(newAvailability);

        if (newAvailability) {
            startTracking();
        } else {
            stopTracking();
        }

        await toggleAvailability(newAvailability);
    }, [
        driverId,
        isAvailable,
        isUpdatingAvailability,
        setIsAvailable,
        startTracking,
        stopTracking,
        toggleAvailability,
    ]);

    const confirmStartRoute = useCallback(() => {
        if (!selectedRoute) return;
        startRouting(selectedRoute);
    }, [selectedRoute, startRouting]);

    const navigateToRoute = useCallback(
        (routeId: string) => {
            router.push(`/(auth)/(tabs)/rotas-detalhadas/${routeId}`);
        },
        [router]
    );

    return {
        driverId,
        isAvailable,
        isLoading,
        isError,
        routes,
        isUpdatingAvailability,
        isStartingRoute,
        refreshing,

        startRoutePopup,
        routeAlreadyStartedPopup,
        unavailablePopup,
        selectedRoute,

        handleToggleAvailability,
        openStartRoutePopup,
        closeStartRoutePopup,
        closeRouteAlreadyStartedPopup,
        closeUnavailablePopup,
        confirmStartRoute,
        navigateToRoute,
        onRefresh,
    };
}
