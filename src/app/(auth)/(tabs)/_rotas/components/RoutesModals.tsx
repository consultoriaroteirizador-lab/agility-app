import { memo } from 'react';

import Modal from '@/components/Modal/Modal';

interface RoutesModalsProps {
    startRoutePopup: boolean;
    routeAlreadyStartedPopup: boolean;
    unavailablePopup: boolean;
    isStartingRoute: boolean;
    onConfirmStartRoute: () => void;
    onCloseStartRoutePopup: () => void;
    onCloseRouteAlreadyStartedPopup: () => void;
    onCloseUnavailablePopup: () => void;
}

function RoutesModalsComponent({
    startRoutePopup,
    routeAlreadyStartedPopup,
    unavailablePopup,
    isStartingRoute,
    onConfirmStartRoute,
    onCloseStartRoutePopup,
    onCloseRouteAlreadyStartedPopup,
    onCloseUnavailablePopup,
}: RoutesModalsProps) {
    return (
        <>
            <Modal
                isVisible={startRoutePopup}
                title="Iniciar rota"
                text="Deseja realmente iniciar esta rota agora?"
                preset="action"
                buttonActionTitle={isStartingRoute ? 'Iniciando...' : 'Confirmar'}
                buttonCloseTitle="Cancelar"
                onPress={onConfirmStartRoute}
                onClose={onCloseStartRoutePopup}
            />

            <Modal
                isVisible={routeAlreadyStartedPopup}
                title="Rota já iniciada"
                text="Você já possui uma rota em andamento. Conclua a rota atual antes de iniciar outra."
                preset="info"
                onClose={onCloseRouteAlreadyStartedPopup}
            />

            <Modal
                isVisible={unavailablePopup}
                title="Motorista indisponível"
                text="Você precisa estar disponível para iniciar ou acessar uma rota. Ative sua disponibilidade na tela inicial."
                preset="info"
                onClose={onCloseUnavailablePopup}
            />
        </>
    );
}

export const RoutesModals = memo(RoutesModalsComponent);
