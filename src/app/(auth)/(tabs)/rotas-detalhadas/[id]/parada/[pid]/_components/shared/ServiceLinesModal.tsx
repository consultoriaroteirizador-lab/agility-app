import { Box, Button } from '@/components';
import Modal from '@/components/Modal/Modal';
import type { ServiceLine } from '@/domain/agility/service/dto/response/service-line.response';
import type { ServiceType } from '@/domain/agility/service/dto/types';
import { linesTitle } from '@/domain/agility/service/serviceLines';
import { measure } from '@/theme';

import { ServiceLinesList } from '../ServiceLinesList';

interface ServiceLinesModalProps {
    isVisible: boolean;
    onClose: () => void;
    lines: readonly ServiceLine[];
    serviceType: ServiceType | null | undefined;
    /** Título do modal (default: "Itens" no pedido, "Equipamentos" no SERVICE). */
    title?: string;
}

export function ServiceLinesModal({ isVisible, onClose, lines, serviceType, title }: ServiceLinesModalProps) {
    return (
        <Modal
            title={title ?? linesTitle(serviceType)}
            isVisible={isVisible}
            onClose={onClose}
        >
            <Box maxHeight={measure.y400} scrollable p="y20" px="x16" gap="y16" >
                <ServiceLinesList lines={lines} serviceType={serviceType} />
                <Button
                    mt='t10'
                    alignSelf='center'
                    title="Fechar"
                    preset="outline"
                    onPress={onClose}
                    width={measure.x280}
                />
            </Box>
        </Modal>
    );
}
