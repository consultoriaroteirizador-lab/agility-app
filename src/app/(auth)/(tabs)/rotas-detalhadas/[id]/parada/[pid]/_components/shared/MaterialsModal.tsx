import { Box, Button } from '@/components';
import type { ServiceMaterialResponse } from '@/domain/agility/service/dto';
import Modal from '@/components/Modal/Modal';
import { measure } from '@/theme';

import { MaterialList } from '../MaterialList';

interface MaterialsModalProps {
    isVisible: boolean;
    onClose: () => void;
    materials: ServiceMaterialResponse[];
}

export function MaterialsModal({ isVisible, onClose, materials }: MaterialsModalProps) {
    return (
        <Modal
            title="Materiais"
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
