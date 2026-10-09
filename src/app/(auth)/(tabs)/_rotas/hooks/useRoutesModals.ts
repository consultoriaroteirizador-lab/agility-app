import { useCallback, useState } from 'react';

import { useRouter } from 'expo-router';

interface UseRoutesModalsReturn {
    unavailablePopup: boolean;
    /** Toque no cartão da rota: abre a rota (a prévia, se ainda não começou). */
    openRoute: (routeId: string) => void;
    closeUnavailablePopup: () => void;
}

/**
 * Toque no cartão de rota da tela inicial.
 *
 * Toda rota abre a tela da rota. A que ainda não começou abre como prévia: a motorista vê as
 * paradas e inicia pelo botão "Iniciar Rota" de lá (decisão de 09/10/2026). Antes, o toque já
 * pedia para iniciar. A prévia também barra o início com outra rota em andamento
 * (`RotaContext.iniciarRota`). Indisponível, a motorista vê o aviso e não abre nada.
 */
export function useRoutesModals(isAvailable: boolean): UseRoutesModalsReturn {
    const router = useRouter();
    const [unavailablePopup, setUnavailablePopup] = useState(false);

    const openRoute = useCallback(
        (routeId: string) => {
            if (!isAvailable) {
                setUnavailablePopup(true);
                return;
            }
            router.push(`/(auth)/(tabs)/rotas-detalhadas/${routeId}`);
        },
        [isAvailable, router]
    );

    const closeUnavailablePopup = useCallback(() => {
        setUnavailablePopup(false);
    }, []);

    return { unavailablePopup, openRoute, closeUnavailablePopup };
}
