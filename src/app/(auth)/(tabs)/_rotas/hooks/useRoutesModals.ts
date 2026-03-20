import { useCallback, useState } from 'react';

import { useRouter } from 'expo-router';

import type { RoutingResponse } from '@/domain/agility/routing/dto';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';

interface UseRoutesModalsProps {
    routes: RoutingResponse[];
    isAvailable: boolean;
}

interface UseRoutesModalsReturn {
    startRoutePopup: boolean;
    routeAlreadyStartedPopup: boolean;
    unavailablePopup: boolean;
    selectedRoute: string | null;

    openStartRoutePopup: (routeId: string, status: string) => void;
    closeStartRoutePopup: () => void;
    closeRouteAlreadyStartedPopup: () => void;
    closeUnavailablePopup: () => void;
    setSelectedRoute: (routeId: string | null) => void;
}

export function useRoutesModals(
    routes: RoutingResponse[],
    isAvailable: boolean
): UseRoutesModalsReturn {
    const router = useRouter();

    const [startRoutePopup, setStartRoutePopup] = useState(false);
    const [routeAlreadyStartedPopup, setRouteAlreadyStartedPopup] = useState(false);
    const [unavailablePopup, setUnavailablePopup] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

    const openStartRoutePopup = useCallback(
        (routeId: string, status: string) => {
            if (!isAvailable) {
                setUnavailablePopup(true);
                return;
            }

            if (status === 'Iniciada') {
                router.push(`/(auth)/(tabs)/rotas-detalhadas/${routeId}`);
                return;
            }

            const inProgressRoute = routes.find((r) => r.status === RoutingStatus.IN_PROGRESS);

            if (inProgressRoute && inProgressRoute.id !== routeId) {
                setRouteAlreadyStartedPopup(true);
                return;
            }

            setSelectedRoute(routeId);
            setStartRoutePopup(true);
        },
        [isAvailable, routes, router]
    );

    const closeStartRoutePopup = useCallback(() => {
        setStartRoutePopup(false);
    }, []);

    const closeRouteAlreadyStartedPopup = useCallback(() => {
        setRouteAlreadyStartedPopup(false);
    }, []);

    const closeUnavailablePopup = useCallback(() => {
        setUnavailablePopup(false);
    }, []);

    return {
        startRoutePopup,
        routeAlreadyStartedPopup,
        unavailablePopup,
        selectedRoute,

        openStartRoutePopup,
        closeStartRoutePopup,
        closeRouteAlreadyStartedPopup,
        closeUnavailablePopup,
        setSelectedRoute,
    };
}
