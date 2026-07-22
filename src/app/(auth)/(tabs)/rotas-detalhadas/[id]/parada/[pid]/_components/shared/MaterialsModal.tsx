import { Box, Button } from '@/components';
import Modal from '@/components/Modal/Modal';
import type { ServiceMaterialResponse } from '@/domain/agility/service/dto';
import { measure } from '@/theme';

import { MaterialList } from '../MaterialList';

interface MaterialsModalProps {
    isVisible: boolean;
    onClose: () => void;
    materials: ServiceMaterialResponse[];
    /** Título do modal (default: "Materiais"). Use "Volumes" no contexto de carga. */
    title?: string;
}

export function MaterialsModal({ isVisible, onClose, materials, title = 'Materiais' }: MaterialsModalProps) {
    return (
        <Modal
            title={title}
            isVisible={isVisible}
            onClose={onClose}
        >
            <Box maxHeight={measure.y400} scrollable p="y20" px="x16" gap="y16" >
                <MaterialList materials={materials || []} />
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
