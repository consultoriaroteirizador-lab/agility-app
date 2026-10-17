import { Box, LocalIcon, Text } from '@/components';
import type { ServiceLine } from '@/domain/agility/service/dto/response/service-line.response';
import type { ServiceType } from '@/domain/agility/service/dto/types';
import { lineGroups, linesTitle, replacedLineLabel } from '@/domain/agility/service/serviceLines';
import { measure } from '@/theme';

type ServiceLinesListProps = {
    lines: readonly ServiceLine[] | null | undefined;
    serviceType: ServiceType | null | undefined;
};

/**
 * As linhas da parada em grupos (fase 3C, C4): no pedido, o grupo principal com o título pelo tipo
 * ("Entregar", "Coletar", "Transportar", "Devolver") e "Recolher"; no SERVICE, "Equipamentos".
 * Fase 3D: a linha trocada leva o selo "Trocado", e a que ficou no lugar dela, "No lugar de: …".
 */
export const ServiceLinesList = ({ lines, serviceType }: ServiceLinesListProps) => {
    const groups = lineGroups(lines, serviceType);

    if (groups.length === 0) {
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
                    Nenhum {linesTitle(serviceType, 1).toLowerCase()} registrado{'\n'}para esta parada.
                </Text>
            </Box>
        );
    }

    return (
        <Box gap="y16">
            {groups.map((group) => (
                <Box key={group.title} gap="y8">
                    <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary">
                        {group.title} ({group.lines.length})
                    </Text>
                    {group.lines.map((line, index) => {
                        const noLugarDe = replacedLineLabel(lines, line);
                        return (
                            <Box
                                key={line.id || index}
                                backgroundColor="gray50"
                                p="y12"
                                borderRadius="s12"
                                borderWidth={measure.m1}
                                borderColor="gray200"
                            >
                                <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                                    <Box flex={1}>
                                        <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                                            {line.material || linesTitle(serviceType, 1)}
                                        </Text>
                                        {!!line.serialNumber && (
                                            <Text preset="text12" color="gray500" mt="y2">
                                                S/N: {line.serialNumber}
                                            </Text>
                                        )}
                                        {line.sku && (
                                            <Text preset="text12" color="gray400" mt="y2">
                                                SKU: {line.sku}
                                            </Text>
                                        )}
                                        {noLugarDe && (
                                            <Text preset="text12" color="gray500" mt="y2">
                                                {noLugarDe}
                                            </Text>
                                        )}
                                    </Box>
                                    <Box alignItems="flex-end" gap="y4">
                                        {line.status === 'SWAPPED' && (
                                            <Box backgroundColor="gray100" px="x8" py="y4" borderRadius="s8">
                                                <Text preset="text12" fontWeightPreset="bold" color="gray500">
                                                    Trocado
                                                </Text>
                                            </Box>
                                        )}
                                        {line.quantity != null && (
                                            <Box backgroundColor="primary100" px="x8" py="y4" borderRadius="s8">
                                                <Text preset="text12" fontWeightPreset="bold" color="white">
                                                    x{line.quantity}{line.unit ? ` ${line.unit}` : ''}
                                                </Text>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                                {line.notes && (
                                    <Text preset="text13" color="gray600" mt="y8">
                                        {line.notes}
                                    </Text>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            ))}
        </Box>
    );
};
