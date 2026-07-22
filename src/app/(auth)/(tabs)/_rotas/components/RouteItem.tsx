import { memo } from 'react';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import type { IconNameMaterial } from '@/components/Icon/Icon';
import type { RoutingResponse } from '@/domain/agility/routing/dto';
import { RoutingStatus, RoutingType } from '@/domain/agility/routing/dto/types';
import { measure } from '@/theme';
import type { ThemeColors } from '@/theme/theme';

import {
    formatCurrency,
    formatDistance,
    formatDuration,
    formatRelativeSince,
    formatRouteDate,
} from '../utils/format';

interface StatusVisual {
    /** Rótulo padrão do status (quando não há detalhe dinâmico). */
    label: string;
    /** Cor da faixa lateral, da bolinha e do texto de status. */
    color: ThemeColors;
    /** Rota "quente" → faixa + borda + fundo tingidos. */
    highlight: boolean;
}

function getStatusVisual(status: RoutingStatus): StatusVisual {
    switch (status) {
        case RoutingStatus.IN_PROGRESS:
            return { label: 'Em andamento', color: 'primary100', highlight: true };
        case RoutingStatus.ASSIGNED:
            return { label: 'A iniciar', color: 'gray400', highlight: false };
        case RoutingStatus.COMPLETED:
            return { label: 'Concluída', color: 'tertiary100', highlight: false };
        case RoutingStatus.CANCELLED:
            return { label: 'Cancelada', color: 'redError', highlight: false };
        default:
            return { label: 'Não iniciada', color: 'gray400', highlight: false };
    }
}

/** Badge de tipo (Serviço/Produto) — usado quando NÃO é trecho de cross-docking. */
function getRoutingTypeBadge(
    routingType: RoutingType | null
): { label: string; color: ThemeColors } | null {
    switch (routingType) {
        case RoutingType.SERVICE:
            return { label: 'Serviço', color: 'secondary100' };
        case RoutingType.PRODUCT:
            return { label: 'Produto', color: 'primary100' };
        default:
            return null;
    }
}

/** Badge de trecho de malha (cross-docking). Tem prioridade sobre o tipo. */
function getLegBadge(
    legType: RoutingResponse['legType']
): { label: string; color: ThemeColors } | null {
    if (legType === 'TRANSFER') return { label: 'Transferência', color: 'secondary100' };
    if (legType === 'LAST_MILE') return { label: 'Last-mile', color: 'primary100' };
    return null;
}

/** "CD Origem → CD Destino" quando o trecho tem instalações nomeadas. */
function getFacilityLine(route: RoutingResponse): string | null {
    const { originFacilityName, destinationFacilityName } = route;
    if (!originFacilityName && !destinationFacilityName) return null;
    if (originFacilityName && destinationFacilityName) {
        return `${originFacilityName} → ${destinationFacilityName}`;
    }
    return `→ ${destinationFacilityName || originFacilityName}`;
}

interface MetricProps {
    icon: IconNameMaterial;
    text: string;
}

function Metric({ icon, text }: MetricProps) {
    return (
        <Box flexDirection="row" alignItems="center" gap="x4">
            <Icon name={icon} size={14} color="gray500" />
            <Text preset="text13" color="gray600">
                {text}
            </Text>
        </Box>
    );
}

interface RouteItemProps {
    route: RoutingResponse;
    onPress: (routeId: string, status: string) => void;
}

function RouteItemComponent({ route, onPress }: RouteItemProps) {
    const status = getStatusVisual(route.status);
    const isInProgress = route.status === RoutingStatus.IN_PROGRESS;

    // Trecho de transferência não tem paradas de entrega (totalServices = 0). O que
    // importa é o lote sendo levado → mostramos "N pedidos" em vez de "0 paradas".
    // (Last-mile tem paradas reais, então segue com "N paradas".)
    const isTransfer = route.legType === 'TRANSFER';
    const orderCount = route.transferOrdersCount ?? 0;

    // O hook de modais compara `status === 'Iniciada'` (string legada) para
    // decidir entre abrir a rota direto e abrir o popup de início. Preservado.
    const legacyStatus = isInProgress ? 'Iniciada' : 'Não iniciado';

    const badge = getLegBadge(route.legType) ?? getRoutingTypeBadge(route.routingType);
    const facilityLine = getFacilityLine(route);
    const dateText = formatRouteDate(route.date);
    const price = formatCurrency(route.totalValue);

    // Rota em andamento mostra "Iniciada há X"; as demais mostram o rótulo.
    const startedSince = isInProgress ? formatRelativeSince(route.startedAt) : null;
    const statusLine = startedSince ? `Iniciada ${startedSince}` : status.label;

    const handlePress = () => {
        onPress(route.id, legacyStatus);
    };

    return (
        <TouchableOpacityBox
            flexDirection="row"
            backgroundColor={status.highlight ? 'primary10' : 'white'}
            borderRadius="s16"
            borderWidth={measure.m1}
            borderColor={status.highlight ? 'primary100' : 'gray200'}
            mb="y16"
            onPress={handlePress}
            style={{ overflow: 'hidden' }}
        >
            {/* Faixa lateral com a cor do status */}
            <Box width={4} backgroundColor={status.color} />

            <Box flex={1} p="y16">
                {/* Nome (linha inteira, até 2 linhas) + badge de tipo/trecho */}
                <Box
                    flexDirection="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap="x8"
                    mb="y8"
                >
                    <Text
                        preset="text16"
                        fontWeightPreset="semibold"
                        color="colorTextPrimary"
                        numberOfLines={2}
                        style={{ flex: 1 }}
                    >
                        {route.name || `Rota #${route.code}`}
                    </Text>
                    {badge ? (
                        <Box
                            backgroundColor={badge.color}
                            px="x12"
                            py="y4"
                            borderRadius="s12"
                            style={{ flexShrink: 0 }}
                        >
                            <Text preset="text12" color="white">
                                {badge.label}
                            </Text>
                        </Box>
                    ) : null}
                </Box>

                {/* Data da rota */}
                {dateText ? (
                    <Box flexDirection="row" alignItems="center" gap="x4" mb="y4">
                        <Icon name="event" size={14} color="gray500" />
                        <Text preset="text13" color="gray600">
                            {dateText}
                        </Text>
                    </Box>
                ) : null}

                {/* Cross-docking: CD origem → destino */}
                {facilityLine ? (
                    <Box flexDirection="row" alignItems="center" gap="x4" mb="y4">
                        <Icon name="warehouse" size={14} color="gray500" />
                        <Text
                            preset="text13"
                            color="gray600"
                            numberOfLines={1}
                            style={{ flex: 1 }}
                        >
                            {facilityLine}
                        </Text>
                    </Box>
                ) : null}

                {/* Métricas */}
                <Box
                    backgroundColor="gray50"
                    p="y12"
                    borderRadius="s12"
                    flexDirection="row"
                    justifyContent="space-between"
                    mt="y8"
                >
                    {isTransfer ? (
                        <Metric
                            icon="inventory-2"
                            text={`${orderCount} ${orderCount === 1 ? 'pedido' : 'pedidos'}`}
                        />
                    ) : (
                        <Metric icon="place" text={`${route.totalServices || 0} paradas`} />
                    )}
                    <Metric icon="straighten" text={formatDistance(route.totalDistanceKm)} />
                    <Metric icon="schedule" text={formatDuration(route.totalDurationMinutes)} />
                </Box>

                {/* Rodapé: status + retorno + valor + chevron */}
                <Box
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    gap="x8"
                    mt="y12"
                >
                    <Box
                        flexDirection="row"
                        alignItems="center"
                        gap="x4"
                        style={{ flexShrink: 1 }}
                    >
                        <Box
                            width={8}
                            height={8}
                            borderRadius="s8"
                            backgroundColor={status.color}
                        />
                        <Text preset="text13" color={status.color} numberOfLines={1}>
                            {statusLine}
                        </Text>
                    </Box>

                    <Box
                        flexDirection="row"
                        alignItems="center"
                        gap="x8"
                        style={{ flexShrink: 0 }}
                    >
                        {route.hasReturn ? (
                            <Box flexDirection="row" alignItems="center" gap="x4">
                                <Icon name="swap-horiz" size={14} color="gray500" />
                                <Text preset="text12" color="gray500">
                                    ida e volta
                                </Text>
                            </Box>
                        ) : null}

                        {price ? (
                            <Box
                                backgroundColor="primary100"
                                px="x12"
                                py="y4"
                                borderRadius="s20"
                            >
                                <Text preset="text13" color="white">
                                    {price}
                                </Text>
                            </Box>
                        ) : null}

                        <Icon name="chevron-right" size={20} color="gray400" />
                    </Box>
                </Box>
            </Box>
        </TouchableOpacityBox>
    );
}

export const RouteItem = memo(RouteItemComponent);
