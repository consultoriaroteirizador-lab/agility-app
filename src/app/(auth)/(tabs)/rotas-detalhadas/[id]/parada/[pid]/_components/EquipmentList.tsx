import { Box, LocalIcon, Text } from '@/components';
import { measure } from '@/theme';

import { EquipmentListProps } from '../_types/stop.types';

/**
 * Component that displays the list of equipment for a stop
 */
export const EquipmentList = ({ equipments }: EquipmentListProps) => {
    if (equipments && equipments.length > 0) {
        return (
            <>
                <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary" mb="y8">
                    Equipamentos ({equipments.length})
                </Text>
                {equipments.map((equipment, index) => (
                    <Box
                        key={equipment.id || index}
                        backgroundColor="gray50"
                        p="y12"
                        borderRadius="s12"
                        borderWidth={measure.m1}
                        borderColor="gray200"
                    >
                        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                            <Box flex={1}>
                                <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                                    {equipment.name || equipment.type || 'Equipamento'}
                                </Text>
                                {equipment.serialNumber && (
                                    <Text preset="text12" color="gray500" mt="y2">
                                        S/N: {equipment.serialNumber}
                                    </Text>
                                )}
                                {equipment.model && (
                                    <Text preset="text12" color="gray400" mt="y2">
                                        Modelo: {equipment.model}
                                    </Text>
                                )}
                            </Box>
                            {equipment.quantity && (
                                <Box backgroundColor="primary100" px="x8" py="y4" borderRadius="s8">
                                    <Text preset="text12" fontWeightPreset="bold" color="white">
                                        x{equipment.quantity}
                                    </Text>
                                </Box>
                            )}
                        </Box>
                        {equipment.description && (
                            <Text preset="text13" color="gray600" mt="y8">
                                {equipment.description}
                            </Text>
                        )}
                    </Box>
                ))}
            </>
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
                Nenhum equipamento registrado{'\n'}para esta parada.
            </Text>
        </Box>
    );
};
