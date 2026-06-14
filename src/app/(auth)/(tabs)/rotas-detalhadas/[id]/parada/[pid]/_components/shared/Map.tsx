import { useState, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import * as MapLibreGL from '@maplibre/maplibre-react-native';
import { LocationObject } from 'expo-location';

import { Box, Text, TouchableOpacityBox, ActivityIndicator, NavigationPopup } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { colors, measure } from '@/theme';

import { FREE_TILE_URLS } from '../../_utils/mapConfig';
import { MapErrorBoundary } from '../MapErrorBoundary';

import { decodePolyline, simplifyCoordinates } from './geo';
import { StopMarker } from './StopMarker';

type MapVariant = 'coleta' | 'service' | 'entrega';

export interface MapPoint {
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    variant?: MapVariant;
    /**
     * Rótulo no badge do pino teardrop — número da parada, "O", "F", etc.
     * Sem rótulo, o pino mostra o badge branco vazio.
     */
    label?: string | number;
    /** Cor do pino. Sem isso, deriva da `variant` (cor do marcador da variante). */
    color?: string;
    /** Tamanho do pino em px (default 39). Use menor para destacar menos (ex.: próxima parada). */
    size?: number;
}

interface MapProps {
    height?: number;
    variant?: MapVariant;
    /** Coordenada única do destino (compatibilidade) */
    latitude?: number | null;
    longitude?: number | null;
    /** Múltiplos pontos para exibir no mapa */
    points?: MapPoint[];
    /** Array de geometrias codificadas (Google Polyline) - cada uma é um segmento independente */
    geometries?: string[];
    /** Geometria única codificada (compatibilidade) */
    geometry?: string;
    /**
     * Segmentos de rota já decodificados (`[lng,lat][]`), renderizados como
     * linhas sem passar pelo decode. Usado para o trecho recortado do traçado
     * global (parada atual → próxima) — ver `geo.sliceRouteBetween`.
     */
    coordinateSegments?: number[][][];
    /** Cor da linha da rota */
    routeColor?: string;
    /** Largura da linha da rota */
    routeWidth?: number;
    /** Mostrar botão de navegação (default: true) */
    showNavigationButton?: boolean;
    addressText?: string;
    customerName?: string;
    userLocation?: LocationObject | null;
    onNavigatePress?: () => void;
    isLoadingAddress?: boolean;
}

const VARIANT_CONFIG = {
    coleta: {
        markerColor: 'secondary100' as const,
        borderColor: 'secondary100' as const,
        label: 'Coleta',
    },
    service: {
        markerColor: 'redError' as const,
        borderColor: 'primary100' as const,
        label: 'Serviço',
    },
    entrega: {
        markerColor: 'redError' as const,
        borderColor: 'primary100' as const,
        label: 'Entrega',
    },
};

// Estilo OSM para MapLibre
const OSM_STYLE = {
    version: 8,
    sources: {
        osm: {
            type: 'raster',
            tiles: [FREE_TILE_URLS.osm],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
        },
    },
    layers: [
        {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
        },
    ],
};

/**
 * Componente de mapa unificado para telas de coleta, serviço e entrega
 * Usa MapLibre + OpenStreetMap (não requer API key do Google)
 *
 * Suporta:
 * - Ponto único (latitude/longitude) para compatibilidade
 * - Múltiplos pontos via prop `points`
 * - Rotas polyline via prop `geometries` (array de encoded polylines do Google)
 */
export function Map({
    height = 180,
    variant = 'service',
    latitude,
    longitude,
    points,
    geometry,
    geometries,
    coordinateSegments,
    routeColor = '#3B82F6',
    routeWidth = 4,
    showNavigationButton = true,
    addressText,
    customerName,
    userLocation,
    onNavigatePress,
    isLoadingAddress,
}: MapProps) {
    const config = VARIANT_CONFIG[variant];
    const [showNavModal, setShowNavModal] = useState(false);

    // Normaliza pontos: usa `points` se fornecido, senão cria ponto único a partir de lat/lng
    const mapPoints = useMemo((): MapPoint[] => {
        if (points && points.length > 0) {
            return points;
        }
        if (latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined) {
            return [{
                id: 'destination',
                latitude: latitude,
                longitude: longitude,
                title: customerName || config.label,
                variant: variant,
            }];
        }
        return [];
    }, [points, latitude, longitude, customerName, config.label, variant]);

    // Decodifica todas as geometrias das rotas (suporta array ou string única)
    const routeSegments = useMemo(() => {
        const allGeometries: string[] = [];

        // Suporta geometries (array) ou geometry (string única)
        if (geometries && geometries.length > 0) {
            allGeometries.push(...geometries.filter(Boolean));
        } else if (geometry) {
            allGeometries.push(geometry);
        }

        // Decodifica cada geometria encoded e simplifica se necessário
        const decoded = allGeometries.map(encoded => ({
            coordinates: simplifyCoordinates(decodePolyline(encoded), 300),
        }));

        // Segmentos já decodificados (ex.: trecho recortado do traçado global)
        const preDecoded = (coordinateSegments ?? [])
            .filter(seg => Array.isArray(seg) && seg.length > 1)
            .map(seg => ({ coordinates: simplifyCoordinates(seg, 300) }));

        return [...decoded, ...preDecoded];
    }, [geometry, geometries, coordinateSegments]);

    // Todas as coordenadas para cálculo de bounds
    const allRouteCoordinates = useMemo(() => {
        return routeSegments.flatMap(segment => segment.coordinates);
    }, [routeSegments]);

    // Calcula o centro do mapa
    const center = useMemo((): [number, number] | null => {
        if (mapPoints.length > 0) {
            return [mapPoints[0].longitude, mapPoints[0].latitude];
        }
        if (allRouteCoordinates.length > 0) {
            const midIndex = Math.floor(allRouteCoordinates.length / 2);
            return allRouteCoordinates[midIndex] as [number, number];
        }
        return null;
    }, [mapPoints, allRouteCoordinates]);

    // Calcula bounds para ajustar a câmera (com padding mínimo para evitar zoom excessivo)
    const cameraBounds = useMemo(() => {
        const allCoords: number[][] = [];

        mapPoints.forEach(p => allCoords.push([p.longitude, p.latitude]));
        allCoords.push(...allRouteCoordinates);
        if (userLocation) {
            allCoords.push([userLocation.coords.longitude, userLocation.coords.latitude]);
        }

        if (allCoords.length === 0) return null;

        const lats = allCoords.map(c => c[1]);
        const lngs = allCoords.map(c => c[0]);

        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);

        // Adiciona padding mínimo de 0.01 graus (~1km) para evitar bounds muito pequenos
        const padding = 0.01;

        return {
            ne: [maxLng + padding, maxLat + padding] as [number, number],
            sw: [minLng - padding, minLat - padding] as [number, number],
            paddingLeft: 50,
            paddingRight: 50,
            paddingTop: 50,
            paddingBottom: 50,
        };
    }, [mapPoints, allRouteCoordinates, userLocation]);

    // Abrir modal de navegação
    const handleNavigatePress = useCallback(() => {
        if (onNavigatePress) {
            onNavigatePress();
        } else {
            setShowNavModal(true);
        }
    }, [onNavigatePress]);

    // Fechar modal de navegação
    const handleCloseNavModal = useCallback(() => {
        setShowNavModal(false);
    }, []);

    // Verificar se tem dados válidos para exibir
    const hasValidData = mapPoints.length > 0 || allRouteCoordinates.length > 0;

    // Destination para navegação (usa primeiro ponto)
    const navigationDestination = mapPoints.length > 0 ? {
        latitude: mapPoints[0].latitude,
        longitude: mapPoints[0].longitude,
        name: mapPoints[0].title || customerName || config.label,
        address: addressText,
        type: config.label,
    } : null;

    if (!hasValidData) {
        return (
            <Box
                height={height}
                backgroundColor="gray100"
                justifyContent="center"
                alignItems="center"
                borderRadius="s12"
                marginBottom="y12"
            >
                <Text preset="text14" color="gray400">
                    Coordenadas não disponíveis
                </Text>
            </Box>
        );
    }

    return (
        <MapErrorBoundary>
            <Box
                height={height}
                borderRadius="s12"
                overflow="hidden"
                marginBottom="y12"
                position="relative"
            >
                {isLoadingAddress ? (
                    <Box
                        flex={1}
                        backgroundColor="gray100"
                        justifyContent="center"
                        alignItems="center"
                    >
                        <ActivityIndicator />
                        <Text preset="text14" color="gray400" marginTop="y8">
                            Carregando mapa...
                        </Text>
                    </Box>
                ) : (
                    <>
                        <MapLibreGL.MapView
                            style={styles.map}
                            mapStyle={OSM_STYLE}
                            logoEnabled={false}
                        >
                            {/* Câmera - usa bounds se disponível, senão center com zoom */}
                            {cameraBounds ? (
                                <MapLibreGL.Camera
                                    bounds={cameraBounds}
                                    animationDuration={0}
                                />
                            ) : (
                                <MapLibreGL.Camera
                                    zoomLevel={15}
                                    centerCoordinate={center ?? undefined}
                                />
                            )}

                            {/* Linhas da rota (múltiplos segmentos) */}
                            {routeSegments.map((segment, idx) => (
                                segment.coordinates.length > 1 && (
                                    <MapLibreGL.ShapeSource
                                        key={`route-${idx}`}
                                        id={`routeSource-${idx}`}
                                        shape={{
                                            type: 'Feature',
                                            geometry: {
                                                type: 'LineString',
                                                coordinates: segment.coordinates,
                                            },
                                            properties: {},
                                        }}
                                    >
                                        <MapLibreGL.LineLayer
                                            id={`routeLine-${idx}`}
                                            style={{
                                                lineColor: routeColor,
                                                lineWidth: routeWidth,
                                                lineCap: 'round',
                                                lineJoin: 'round',
                                            }}
                                        />
                                    </MapLibreGL.ShapeSource>
                                )
                            ))}

                            {/* Marcadores dos pontos — pino teardrop (igual ao platform).
                                Âncora na ponta inferior do pino (x=0.5, y=1). Cor explícita
                                (point.color) tem prioridade; senão deriva da variante. Label
                                explícito tem prioridade; senão numera quando há vários pontos. */}
                            {mapPoints.map((point, index) => {
                                const pointConfig = point.variant ? VARIANT_CONFIG[point.variant] : config;
                                const pinColor = point.color ?? colors[pointConfig.markerColor];
                                const pinLabel = point.label ?? (mapPoints.length > 1 ? index + 1 : undefined);
                                return (
                                    <MapLibreGL.PointAnnotation
                                        key={point.id}
                                        id={point.id}
                                        coordinate={[point.longitude, point.latitude]}
                                        title={point.title || `Ponto ${index + 1}`}
                                        anchor={{ x: 0.5, y: 1 }}
                                    >
                                        <StopMarker color={pinColor} label={pinLabel} size={point.size} />
                                    </MapLibreGL.PointAnnotation>
                                );
                            })}

                            {/* Marcador da localização atual do usuário */}
                            {userLocation && (
                                <MapLibreGL.PointAnnotation
                                    id="userLocation"
                                    coordinate={[userLocation.coords.longitude, userLocation.coords.latitude]}
                                    title="Sua localização"
                                >
                                    <Box
                                        width={24}
                                        height={24}
                                        backgroundColor="primary100"
                                        borderRadius="s12"
                                        borderWidth={2}
                                        borderColor="white"
                                    />
                                </MapLibreGL.PointAnnotation>
                            )}
                        </MapLibreGL.MapView>

                        {/* Botão de navegação */}
                        {showNavigationButton && (
                            <Box
                                position="absolute"
                                right={measure.r16}
                                bottom={measure.y10}
                            >
                                <TouchableOpacityBox
                                    backgroundColor="white"
                                    padding="y10"
                                    borderRadius="s16"
                                    borderWidth={measure.m1}
                                    borderColor={config.borderColor}
                                    onPress={handleNavigatePress}
                                    shadowColor="black"
                                    shadowOffset={{ width: 0, height: 2 }}
                                    shadowOpacity={0.25}
                                    shadowRadius={4}
                                    elevation={5}
                                >
                                    <Icon name="navigation" size={measure.m24} />
                                </TouchableOpacityBox>
                            </Box>
                        )}
                    </>
                )}

                {/* Modal de navegação (só mostra se não tiver onNavigatePress externo e botão visível) */}
                {showNavigationButton && !onNavigatePress && (
                    <NavigationPopup
                        visible={showNavModal}
                        onClose={handleCloseNavModal}
                        destination={navigationDestination}
                    />
                )}
            </Box>
        </MapErrorBoundary>
    );
}

const styles = StyleSheet.create({
    map: {
        width: '100%',
        height: '100%',
    },
});
