import { memo } from 'react';

import Modal from '@/components/Modal/Modal';

interface RoutesModalsProps {
    unavailablePopup: boolean;
    onCloseUnavailablePopup: () => void;
}

function RoutesModalsComponent({
    unavailablePopup,
    onCloseUnavailablePopup,
}: RoutesModalsProps) {
    return (
        <Modal
            isVisible={unavailablePopup}
            title="Motorista indisponível"
            text="Você precisa estar disponível para iniciar ou acessar uma rota. Ative sua disponibilidade na tela inicial."
            preset="info"
            onClose={onCloseUnavailablePopup}
        />
    );
}

export const RoutesModals = memo(RoutesModalsComponent);
