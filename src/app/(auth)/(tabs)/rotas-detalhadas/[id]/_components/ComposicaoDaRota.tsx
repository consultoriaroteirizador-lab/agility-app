import { Box, Text } from '@/components'
import { Icon } from '@/components/Icon/Icon'
import { measure } from '@/theme'

import { useRota } from '../_context/RotaContext'
import { formatComposicao } from '../_utils/composicao'

/**
 * Veículo (ou cavalo + carretas) da rota, lido do contexto da rota aberta.
 * Renderiza `null` sem veículo — inclusive com backend que ainda não manda
 * `vehicle`/`trailers`.
 */
export function ComposicaoDaRota() {
    const { routing } = useRota()
    const texto = formatComposicao(routing?.vehicle, routing?.trailers)

    if (!texto) return null

    return (
        <Box marginBottom="y16" flexDirection="row" alignItems="center" gap="x8" paddingVertical="y8">
            <Icon name="local-shipping" size={measure.m20} color="gray500" />
            <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary" style={{ flex: 1 }}>
                {texto}
            </Text>
        </Box>
    )
}
