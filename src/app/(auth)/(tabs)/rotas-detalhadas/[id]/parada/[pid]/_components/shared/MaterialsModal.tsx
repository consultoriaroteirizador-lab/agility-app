import { Box, Button } from '@/components';
import Modal from '@/components/Modal/Modal';
import { measure } from '@/theme';

import { MaterialList } from '../MaterialList';

interface ServiceMaterial {
    id: string;
    material: string;
    quantity: number;
    unit?: string;
    serialNumber?: string;
    sku?: string;
    notes?: string;
}

interface MaterialsModalProps {
    isVisible: boolean;
    onClose: () => void;
    materials: ServiceMaterial[];
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
