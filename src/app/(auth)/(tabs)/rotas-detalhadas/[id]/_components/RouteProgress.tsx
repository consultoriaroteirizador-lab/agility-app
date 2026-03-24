/**
 * RouteProgress - Barra de progresso da rota
 *
 * Exibe a barra de progresso visual com porcentagem e contagem de paradas.
 * Consome dados do RotaContext através do hook useRota().
 *
 * @module rotas-detalhadas/components
 */

import { Box, Text } from '@/components'
import { measure } from '@/theme'

import { useRota } from '../_context/RotaContext'

/**
 * Componente de barra de progresso da rota
 *
 * Exibe:
 * - Barra de progresso visual
 * - Porcentagem de conclusão
 * - Contagem de paradas (X de Y concluídas)
 *
 * @returns Componente React da barra de progresso
 *
 * @example
 * ```tsx
 * function RotaScreen() {
 *   return (
 *     <RotaProvider routeId="123">
 *       <RouteHeader />
 *       <RouteProgress />
 *       {/* outros componentes *\/}
 *     </RotaProvider>
 *   )
 * }
 * ```
 */
export function RouteProgress() {
    const { progress, contagem } = useRota()

    // Calcula a porcentagem formatada
    const porcentagemFormatada = Math.round(progress)

    // Texto de contagem de paradas
    const textoContagem = `${contagem.concluidas} de ${contagem.total} concluídas`

    return (
        <Box marginBottom="y24">
            {/* Header com porcentagem e contagem */}
            <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                marginBottom="y8"
            >
                <Text
                    preset="text14"
                    fontWeightPreset='bold'
                    color="colorTextPrimary"
                >
                    Progresso
                </Text>

                <Box flexDirection="row" alignItems="center" gap="x8">
                    <Text
                        preset="text14"
                        fontWeightPreset='semibold'
                        color="primary100"
                    >
                        {porcentagemFormatada}%
                    </Text>
                    <Text
                        preset="text12"
                        color="gray400"
                    >
                        ({textoContagem})
                    </Text>
                </Box>
            </Box>

            {/* Barra de progresso visual */}
            <Box
                width="100%"
                height={measure.y12}
                backgroundColor="gray100"
                borderRadius="s12"
                overflow="hidden"
            >
                <Box
                    width={`${progress}%`}
                    backgroundColor="primary100"
                    height={measure.y12}
                    borderRadius="s12"
                />
            </Box>

            {/* Detalhes de status */}
            <Box
                flexDirection="row"
                justifyContent="flex-start"
                gap="x16"
                marginTop="y8"
            >
                {/* Pendentes */}
                {contagem.pendentes > 0 && (
                    <Box flexDirection="row" alignItems="center" gap="x4">
                        <Box
                            width={measure.x8}
                            height={measure.y8}
                            backgroundColor="gray300"
                            borderRadius="s4"
                        />
                        <Text preset="text12" color="gray400">
                            {contagem.pendentes} pendente{contagem.pendentes > 1 ? 's' : ''}
                        </Text>
                    </Box>
                )}

                {/* Em andamento */}
                {contagem.emAndamento > 0 && (
                    <Box flexDirection="row" alignItems="center" gap="x4">
                        <Box
                            width={measure.x8}
                            height={measure.y8}
                            backgroundColor="primary100"
                            borderRadius="s4"
                        />
                        <Text preset="text12" color="primary100">
                            {contagem.emAndamento} em andamento
                        </Text>
                    </Box>
                )}

                {/* Concluídas com sucesso */}
                {contagem.concluidasSucesso > 0 && (
                    <Box flexDirection="row" alignItems="center" gap="x4">
                        <Box
                            width={measure.x8}
                            height={measure.y8}
                            backgroundColor="tertiary100"
                            borderRadius="s4"
                        />
                        <Text preset="text12" color="tertiary100">
                            {contagem.concluidasSucesso} concluída{contagem.concluidasSucesso > 1 ? 's' : ''}
                        </Text>
                    </Box>
                )}

                {/* Concluídas com insucesso */}
                {contagem.concluidasInsucesso > 0 && (
                    <Box flexDirection="row" alignItems="center" gap="x4">
                        <Box
                            width={measure.x8}
                            height={measure.y8}
                            backgroundColor="redError"
                            borderRadius="s4"
                        />
                        <Text preset="text12" color="redError">
                            {contagem.concluidasInsucesso} insucesso{contagem.concluidasInsucesso > 1 ? 's' : ''}
                        </Text>
                    </Box>
                )}
            </Box>
        </Box>
    )
}
