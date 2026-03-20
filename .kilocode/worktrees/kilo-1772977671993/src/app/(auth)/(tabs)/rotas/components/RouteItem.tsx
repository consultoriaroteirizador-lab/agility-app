import { memo } from 'react';

import { Box, Text, TouchableOpacityBox } from '@/components';
import type { RoutingResponse } from '@/domain/agility/routing/dto';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';
import { measure } from '@/theme';
import type { ThemeColors } from '@/theme/theme';

function getStatusText(status: RoutingStatus): string {
    switch (status) {
        case RoutingStatus.IN_PROGRESS:
            return 'Iniciada';
        case RoutingStatus.COMPLETED:
            return 'Concluída';
        case RoutingStatus.CANCELLED:
            return 'Cancelada';
        default:
            return 'Não iniciado';
    }
}

function getStatusColor(status: RoutingStatus): ThemeColors {
    switch (status) {
        case RoutingStatus.IN_PROGRESS:
            return 'primary100';
        case RoutingStatus.COMPLETED:
            return 'tertiary100';
        case RoutingStatus.CANCELLED:
            return 'redError';
        default:
            return 'gray400';
    }
}

interface RouteItemProps {
    route: RoutingResponse;
    onPress: (routeId: string, status: string) => void;
}

function RouteItemComponent({ route, onPress }: RouteItemProps) {
    const statusText = getStatusText(route.status);
    const statusColor = getStatusColor(route.status);

    const handlePress = () => {
        onPress(route.id, statusText);
    };

    return (
        <TouchableOpacityBox
            bg="white"
            borderRadius="s16"
            p="y16"
            borderWidth={measure.m1}
            borderColor="gray200"
            mb="y16"
            onPress={handlePress}
        >
            <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="y12" gap="x8">
                <Text
                    preset="text16"
                    color="colorTextPrimary"
                    numberOfLines={1}
                    style={{ flexShrink: 1 }}
                >
                    {route.name || `Rota #${route.code}`}
                </Text>
                <Box bg="primary100" px="x16" py="y4" borderRadius="s20" style={{ flexShrink: 0 }}>
                    <Text preset="text13" color="white">
                        R$ {route.totalValue?.toFixed(2).replace('.', ',') || '0,00'}
                    </Text>
                </Box>
            </Box>

            <Box
                bg="gray50"
                p="y12"
                borderRadius="s12"
                flexDirection="row"
                justifyContent="space-between"
            >
                <Box flexDirection="row" alignItems="center" gap="x8">
                    <Text preset="text13" color="gray600">
                        {route.totalServices || 0} Paradas
                    </Text>
                </Box>
                <Box flexDirection="row" alignItems="center" gap="x8">
                    <Text preset="text13" color="gray600">
                        {route.totalDistanceKm || 0} km
                    </Text>
                </Box>
                <Box flexDirection="row" alignItems="center" gap="x8">
                    <Text preset="text13" color="gray600">
                        {route.totalDurationMinutes ? Math.round(route.totalDurationMinutes / 60) : 0} h
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="row" alignItems="center" gap="x8" mt="y12">
                <Text preset="text13" color={statusColor}>
                    {statusText}
                </Text>
            </Box>
        </TouchableOpacityBox>
    );
}

export const RouteItem = memo(RouteItemComponent);
