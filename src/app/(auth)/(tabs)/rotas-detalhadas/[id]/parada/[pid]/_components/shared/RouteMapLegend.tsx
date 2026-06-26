/**
 * RouteMapLegend - Legenda de cores do mapa da rota
 *
 * Explica as cores dos pinos (origem/retorno e status das paradas). Compartilhada
 * pelo modal de tela cheia e pelo mapa embutido do histórico.
 *
 * @module rotas-detalhadas/shared
 */

import { Box, Text } from '@/components'

import { ROUTE_MAP_COLORS } from './useRouteMapView'

function LegendaItem({ color, label }: { color: string; label: string }) {
    return (
        <Box flexDirection="row" alignItems="center" gap="x4">
            <Box width={10} height={10} borderRadius="s8" style={{ backgroundColor: color }} />
            <Text preset="text12" color="gray600">{label}</Text>
        </Box>
    )
}

export function RouteMapLegend() {
    return (
        <Box flexDirection="row" flexWrap="wrap" gap="x16">
            <LegendaItem color={ROUTE_MAP_COLORS.origin} label="Origem/Retorno" />
            <LegendaItem color={ROUTE_MAP_COLORS.pending} label="Pendente" />
            <LegendaItem color={ROUTE_MAP_COLORS.done} label="Concluída" />
            <LegendaItem color={ROUTE_MAP_COLORS.fail} label="Insucesso" />
        </Box>
    )
}
