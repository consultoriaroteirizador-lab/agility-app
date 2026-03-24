/**
 * RouteHeader - Cabeçalho da tela de detalhes da rota
 *
 * Exibe o título da rota com código, badge de progresso e botão de voltar.
 * Consome dados do RotaContext através do hook useRota().
 *
 * @module rotas-detalhadas/components
 */

import { useRouter } from 'expo-router'

import { Box, Text, TouchableOpacityBox } from '@/components'

import { useRota } from '../_context/RotaContext'

/**
 * Componente de cabeçalho da rota
 *
 * Exibe:
 * - Botão de voltar
 * - Nome/código da rota
 * - Badge com progresso (X/Y paradas)
 *
 * @returns Componente React do cabeçalho
 *
 * @example
 * ```tsx
 * function RotaScreen() {
 *   return (
 *     <RotaProvider routeId="123">
 *       <RouteHeader />
 *       {/* outros componentes *\/}
 *     </RotaProvider>
 *   )
 * }
 * ```
 */
export function RouteHeader() {
    const router = useRouter()
    const { rota, proximaParada, paradas } = useRota()

    /**
     * Handler para o botão de voltar
     */
    const handleVoltar = () => {
        router.back()
    }

    // Formata o título da rota
    const tituloRota = rota?.nome || `Rota ${rota?.codigo || ''}`

    // Calcula o número da próxima parada para exibir no badge
    const numeroProximaParada = proximaParada?.numero
    const totalParadas = paradas.length

    return (
        <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            marginBottom="y16"
        >
            {/* Botão Voltar */}
            <TouchableOpacityBox
                onPress={handleVoltar}
                marginRight="x12"
            >
                <Text
                    preset="text18"
                    color="primary100"
                >
                    ←
                </Text>
            </TouchableOpacityBox>

            {/* Título e Badge */}
            <Box
                flex={1}
                flexDirection="row"
                alignItems="center"
                gap="x8"
            >
                <Text
                    preset="text18"
                    fontWeightPreset='semibold'
                    color="colorTextPrimary"
                    numberOfLines={1}
                >
                    {tituloRota}
                </Text>

                {/* Badge de progresso - só exibe se houver próxima parada */}
                {proximaParada && numeroProximaParada && (
                    <Box
                        backgroundColor="primary10"
                        paddingHorizontal="x12"
                        paddingVertical="y2"
                        borderRadius="s20"
                    >
                        <Text
                            preset="text13"
                            color="primary100"
                        >
                            {numeroProximaParada}/{totalParadas}
                        </Text>
                    </Box>
                )}
            </Box>
        </Box>
    )
}
