import { Box, LocalIcon, Text } from '@/components';
import { measure } from '@/theme';

import { MaterialListProps } from '../_types/stop.types';

/**
 * Component that displays the list of materials for a service
 */
export const MaterialList = ({ materials }: MaterialListProps) => {
    if (materials && materials.length > 0) {
        return (
            <Box gap="y12">
                {materials.map((material, index) => (
                    <Box
                        key={material.id || index}
                        backgroundColor="gray50"
                        p="y16"
                        px="x16"
                        borderRadius="s12"
                        borderWidth={measure.m1}
                        borderColor="gray200"
                    >
                        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                            <Box flex={1} pr="x8">
                                <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                                    {material.material || 'Material'}
                                </Text>
                                {material.serialNumber && (
                                    <Text preset="text12" color="gray500" mt="y2">
                                        S/N: {material.serialNumber}
                                    </Text>
                                )}
                                {material.sku && (
                                    <Text preset="text12" color="gray400" mt="y2">
                                        SKU: {material.sku}
                                    </Text>
                                )}
                            </Box>
                            <Box backgroundColor="primary100" px="x12" py="y6" borderRadius="s8">
                                <Text preset="text13" fontWeightPreset="bold" color="white">
                                    {material.quantity}{material.unit ? ` ${material.unit}` : ''}
                                </Text>
                            </Box>
                        </Box>
                        {material.notes && (
                            <Text preset="text13" color="gray600" mt="y8">
                                {material.notes}
                            </Text>
                        )}
                    </Box>
                ))}
            </Box>
        );
    }

    // Empty state
    return (
        <Box alignItems="center" py="y32">
            <Box
                width={measure.x60}
                height={measure.y60}
                borderRadius="s32"
                backgroundColor="gray100"
                justifyContent="center"
                alignItems="center"
                mb="y12"
            >
                <LocalIcon iconName="box" size={32} color="gray400" />
            </Box>
            <Text preset="text14" color="gray400" textAlign="center">
                Nenhum material registrado{'\n'}para este serviço.
            </Text>
        </Box>
    );
};
