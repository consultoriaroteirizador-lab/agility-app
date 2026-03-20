import { useState, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import * as MapLibreGL from '@maplibre/maplibre-react-native';
import { LocationObject } from 'expo-location';

import { Box, Text, TouchableOpacityBox, ActivityIndicator, NavigationPopup } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { measure } from '@/theme';

import { FREE_TILE_URLS } from '../../_utils/mapConfig';
import { MapErrorBoundary } from '../MapErrorBoundary';

type MapVariant = 'coleta' | 'service' | 'entrega';

export interface MapPoint {
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    variant?: MapVariant;
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

/**
 * Decodifica uma encoded polyline do Google Maps para array de coordenadas [longitude, latitude]
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded: string): number[][] {
    const coords: number[][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let shift = 0;
        let result = 0;
        let byte: number;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        lat += result & 1 ? ~(result >> 1) : result >> 1;

        shift = 0;
        result = 0;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        lng += result & 1 ? ~(result >> 1) : result >> 1;

        // MapLibre usa [longitude, latitude]
        coords.push([lng / 1e5, lat / 1e5]);
    }

    return coords;
}

/**
 * Simplifica uma polyline removendo pontos (Douglas-Peucker simplificado)
 */
function simplifyCoordinates(coords: number[][], maxPoints: number = 500): number[][] {
    if (coords.length <= maxPoints) return coords;

    const step = Math.ceil(coords.length / maxPoints);
    const simplified: number[][] = [];

    // Sempre incluir primeiro e último
    simplified.push(coords[0]);

    for (let i = step; i < coords.length - 1; i += step) {
        simplified.push(coords[i]);
    }

    simplified.push(coords[coords.length - 1]);
    return simplified;
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

        if (allGeometries.length === 0) return [];

        // Decodifica cada segmento e simplifica se necessário
        return allGeometries.map(encoded => ({
            coordinates: simplifyCoordinates(decodePolyline(encoded), 300),
        }));
    }, [geometry, geometries]);

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

                            {/* Marcadores dos pontos */}
                            {mapPoints.map((point, index) => {
                                const pointConfig = point.variant ? VARIANT_CONFIG[point.variant] : config;
                                return (
                                    <MapLibreGL.PointAnnotation
                                        key={point.id}
                                        id={point.id}
                                        coordinate={[point.longitude, point.latitude]}
                                        title={point.title || `Ponto ${index + 1}`}
                                    >
                                        <Box
                                            width={30}
                                            height={30}
                                            backgroundColor={pointConfig.markerColor}
                                            borderRadius="s15"
                                            justifyContent="center"
                                            alignItems="center"
                                        >
                                            <Text preset="text16" color="white" fontWeightPreset="bold">
                                                {mapPoints.length > 1 ? `${index + 1}` : '📍'}
                                            </Text>
                                        </Box>
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
