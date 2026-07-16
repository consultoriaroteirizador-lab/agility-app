import { useCallback, useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { useFindOneDriver, useUpdateDriver } from '@/domain/agility/driver/useCase';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';
import { useFindMyRoutings, useStartRouting } from '@/domain/agility/routing/useCase';
import { KEY_DRIVER } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';
import { resolveDisplayedAvailability } from '@/services/location/trackingGate';

import { useRoutesModals } from './useRoutesModals';

function useDriverAvailability() {
    const { userAuth } = useAuthCredentialsService();
    const driverId = userAuth?.driverId || null;
    const queryClient = useQueryClient();

    // Fonte da verdade: o servidor. Persiste a disponibilidade entre aberturas.
    const { driver } = useFindOneDriver(driverId);
    const serverAvailable = driver?.isAvailable ?? false;

    // Valor pedido enquanto o PATCH está em voo (otimismo). null = sem pendência.
    const [pendingValue, setPendingValue] = useState<boolean | null>(null);
    const isAvailable = resolveDisplayedAvailability(serverAvailable, pendingValue);

    const { updateDriver, isLoading: isUpdatingAvailability } = useUpdateDriver({
        onSuccess: () => {
            if (driverId) {
                queryClient.invalidateQueries({ queryKey: [KEY_DRIVER, driverId] });
            }
        },
        onError: (error) => {
            setPendingValue(null); // reverte pro valor do servidor
            console.error('[useDriverAvailability] Error updating availability:', error);
        },
    });

    // Limpa o otimismo quando o servidor já reflete o valor pedido (sem flicker).
    useEffect(() => {
        if (pendingValue !== null && serverAvailable === pendingValue) {
            setPendingValue(null);
        }
    }, [serverAvailable, pendingValue]);

    const toggleAvailability = useCallback(
        async (newValue: boolean) => {
            if (!driverId || isUpdatingAvailability) return false;

            setPendingValue(newValue); // otimista
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
    } = useDriverAvailability();

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

    // O toggle controla APENAS a disponibilidade para leilão. O rastreamento é
    // dirigido pela rota IN_PROGRESS no LocationTrackingProvider — marcar-se
    // indisponível não para mais o tracking de uma rota em andamento.
    const handleToggleAvailability = useCallback(async () => {
        if (!driverId || isUpdatingAvailability) return;

        const newAvailability = !isAvailable;

        await toggleAvailability(newAvailability);
    }, [driverId, isAvailable, isUpdatingAvailability, toggleAvailability]);

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
