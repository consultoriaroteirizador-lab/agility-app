import { useMemo } from 'react';

import { Box, Text } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { useFindAllDistributionCenters } from '@/domain/agility/distribution-center/useCase';
import { useGetRoutingMapData } from '@/domain/agility/routing/useCase/useGetRoutingMapData';
import { useRouteDirections } from '@/domain/ors/useRouteDirections';
import { measure } from '@/theme';

import { useRota } from '../_context/RotaContext';
import { Map, type MapPoint } from '../parada/[pid]/_components/shared/Map';

import { TransferOrderList } from './TransferOrderList';

const ORIGIN_COLOR = '#10B981';
const DEST_COLOR = '#EF4444';

/**
 * Etapa 1 (overview) da tela de transferência: cards de CD origem/destino,
 * mapa com o traçado CD1 → CD2 (via ORS, com fallback de linha reta) e o
 * lote de carga que compõe este trecho.
 */
export function TransferOverviewStep() {
    const { routing, paradas } = useRota();
    const { origin } = useGetRoutingMapData(routing?.id ?? '');
    const { distributionCenters } = useFindAllDistributionCenters(
        { activeOnly: true },
        { enabled: !!routing?.destinationFacilityId },
    );

    const cd2 = useMemo(
        () => (routing?.destinationFacilityId ? distributionCenters.find((c) => c.id === routing.destinationFacilityId) : undefined),
        [distributionCenters, routing?.destinationFacilityId],
    );

    const cd1Coords = origin?.latitude != null && origin?.longitude != null ? { latitude: origin.latitude, longitude: origin.longitude } : null;
    const cd2Coords = cd2 ? { latitude: cd2.latitude, longitude: cd2.longitude } : null;
    const roadGeometry = useRouteDirections(cd1Coords, cd2Coords);

    const points: MapPoint[] = [
        ...(cd1Coords ? [{ id: 'cd1', latitude: cd1Coords.latitude, longitude: cd1Coords.longitude, variant: 'cd' as const, label: 'O', color: ORIGIN_COLOR }] : []),
        ...(cd2Coords ? [{ id: 'cd2', latitude: cd2Coords.latitude, longitude: cd2Coords.longitude, variant: 'cd' as const, label: 'D', color: DEST_COLOR }] : []),
    ];
    const coordinateSegments = !roadGeometry && cd1Coords && cd2Coords
        ? [[[cd1Coords.longitude, cd1Coords.latitude], [cd2Coords.longitude, cd2Coords.latitude]]]
        : undefined;

    const origemNome = routing?.originFacilityName || 'CD de origem';
    const origemEndereco = origin?.address || '';
    const destinoNome = routing?.destinationFacilityName || cd2?.name || 'CD de destino';
    const destinoEndereco = cd2?.address || '';

    const cdCard = (label: string, nome: string, endereco: string, color: string) => (
        <Box backgroundColor="gray50" borderRadius="s12" borderWidth={1} borderColor="gray200" p="y12" flexDirection="row" alignItems="flex-start">
            <Box width={measure.m36} height={measure.m36} borderRadius="s20" justifyContent="center" alignItems="center" style={{ backgroundColor: color }}>
                <Icon name="warehouse" size={measure.m20} color="white" />
            </Box>
            <Box flex={1} marginLeft="x12">
                <Text preset="text12" color="gray600">{label}</Text>
                <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary">{nome}</Text>
                {endereco ? <Text preset="text13" color="gray700" marginTop="y4">{endereco}</Text> : null}
            </Box>
        </Box>
    );

    return (
        <Box gap="y16">
            {cdCard('Origem', origemNome, origemEndereco, ORIGIN_COLOR)}
            {cdCard('Destino', destinoNome, destinoEndereco, DEST_COLOR)}

            {cd1Coords ? (
                <Box borderRadius="s12" overflow="hidden">
                    <Map height={measure.y220} points={points} geometries={roadGeometry ? [roadGeometry] : undefined} coordinateSegments={coordinateSegments} routeColor={DEST_COLOR} routeWidth={4} showNavigationButton={false} />
                </Box>
            ) : null}

            <TransferOrderList paradas={paradas} />
        </Box>
    );
}
