/**
 * MapaParadasModal - Mapa de TODAS as paradas da rota
 *
 * Modal em tela cheia que desenha origem, todas as paradas (numeradas e
 * coloridas por status) e o retorno, ligados pelo traçado da rota. O trecho
 * de retorno (última parada → origem/retorno) é desenhado tracejado.
 *
 * Reaproveita o hook `useRouteMapView` (mesma lógica do mapa do histórico) e o
 * componente `<Map>` (MapLibre + OSM, pinos teardrop, bounds automático).
 *
 * @module rotas-detalhadas/components
 */

import { Modal } from 'react-native'

import { ActivityIndicator, Box, Text, TouchableOpacityBox } from '@/components'
import { Icon } from '@/components/Icon/Icon'
import { useAppSafeArea } from '@/hooks'
import { colors } from '@/theme'

import { Map } from '../parada/[pid]/_components/shared/Map'
import { RouteMapLegend } from '../parada/[pid]/_components/shared/RouteMapLegend'
import { useRouteMapView } from '../parada/[pid]/_components/shared/useRouteMapView'

// ============================================
// PROPS
// ============================================

export interface MapaParadasModalProps {
    visible: boolean
    onClose: () => void
    routeId: string
}

// ============================================
// COMPONENTE
// ============================================

export function MapaParadasModal({ visible, onClose, routeId }: MapaParadasModalProps) {
    const safeArea = useAppSafeArea()
    const { mapPoints, outboundSegments, dashedSegments, isLoading, hasPoints } =
        useRouteMapView(routeId)

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <Box flex={1} backgroundColor="white" style={{ paddingTop: safeArea.top }}>
                {/* Header */}
                <Box
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    paddingHorizontal="x16"
                    paddingBottom="y12"
                >
                    <Text preset="text16" fontWeightPreset="bold" color="colorTextPrimary">
                        Mapa da rota
                    </Text>
                    <TouchableOpacityBox
                        onPress={onClose}
                        padding="y8"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Icon name="close" />
                    </TouchableOpacityBox>
                </Box>

                {/* Mapa */}
                <Box flex={1}>
                    {isLoading ? (
                        <Box flex={1} justifyContent="center" alignItems="center">
                            <ActivityIndicator />
                            <Text preset="text14" color="gray400" marginTop="y8">
                                Carregando mapa...
                            </Text>
                        </Box>
                    ) : !hasPoints ? (
                        <Box flex={1} justifyContent="center" alignItems="center" paddingHorizontal="x16">
                            <Text preset="text14" color="gray400">
                                Nenhuma parada com localização disponível.
                            </Text>
                        </Box>
                    ) : (
                        <Map
                            fill
                            points={mapPoints}
                            coordinateSegments={outboundSegments}
                            dashedSegments={dashedSegments}
                            routeColor={colors.primary100}
                            dashedColor={colors.gray500}
                            routeWidth={4}
                            showNavigationButton={false}
                        />
                    )}
                </Box>

                {/* Legenda */}
                {hasPoints && !isLoading && (
                    <Box
                        paddingHorizontal="x16"
                        paddingTop="y12"
                        style={{ paddingBottom: safeArea.bottom }}
                    >
                        <RouteMapLegend />
                    </Box>
                )}
            </Box>
        </Modal>
    )
}
