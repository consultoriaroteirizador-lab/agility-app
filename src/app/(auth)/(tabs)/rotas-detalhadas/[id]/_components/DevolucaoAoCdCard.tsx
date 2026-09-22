/**
 * DevolucaoAoCdCard — "Devolver ao CD" na tela da rota.
 *
 * Responde a uma pergunta que a lista de paradas não responde: **o que ainda
 * está no caminhão e precisa voltar**. O caso que obrigou o card a existir é o
 * pedido CANCELADO com a carga já na rua — ele sai da rota no mesmo gesto do
 * cancelamento, a parada some da tela, e até aqui o motorista só descobria a
 * obrigação ao chegar no CD (onde a parada de RETORNO já lista a pendência,
 * desde que a conferência passou a ler do backend).
 *
 * Fica no header das DUAS abas de propósito: não é parada, é obrigação da rota
 * inteira, e precisa ser vista enquanto ainda dá para planejar a volta.
 *
 * Sem pendência, não renderiza nada — inclusive quando o endpoint falha, caso em
 * que a lista chega vazia. Um card de erro aqui assustaria sem informar.
 */

import { Box, Text } from '@/components'
import { measure } from '@/theme'

import type { DevolucaoRow } from '../_utils'

export interface DevolucaoAoCdCardProps {
    rows: DevolucaoRow[]
}

export function DevolucaoAoCdCard({ rows }: DevolucaoAoCdCardProps) {
    if (rows.length === 0) return null

    return (
        <Box
            backgroundColor="white"
            borderRadius="s12"
            borderWidth={measure.m1}
            borderColor="tertiary100"
            paddingVertical="y16"
            paddingHorizontal="x16"
            marginBottom="y16"
            gap="x8"
        >
            <Box flexDirection="row" alignItems="center" gap="x8">
                <Text preset="text15" fontWeightPreset="bold" color="gray600">
                    Devolver ao CD
                </Text>
                <Box
                    backgroundColor="tertiary20"
                    paddingHorizontal="x8"
                    paddingVertical="y2"
                    borderRadius="s4"
                    flexShrink={0}
                >
                    <Text preset="text13" color="tertiary100" fontWeightPreset="bold">
                        {rows.length}
                    </Text>
                </Box>
            </Box>

            <Text preset="text13" color="gray400">
                {rows.length === 1
                    ? 'Esta mercadoria ainda está com você. Entregue na parada de retorno.'
                    : 'Estas mercadorias ainda estão com você. Entregue na parada de retorno.'}
            </Text>

            {rows.map((row) => (
                <Box key={row.serviceId} gap="x4" marginTop="y8">
                    <Box flexDirection="row" alignItems="center" flexWrap="wrap" gap="x8">
                        <Text preset="text14" color="gray600" fontWeightPreset="bold">
                            {row.titulo}
                        </Text>
                        <Box
                            backgroundColor="gray100"
                            paddingHorizontal="x8"
                            paddingVertical="y2"
                            borderRadius="s4"
                            flexShrink={0}
                        >
                            <Text preset="text12" color="gray600">
                                {row.desfecho}
                            </Text>
                        </Box>
                    </Box>

                    {row.motivo && (
                        <Text preset="text12" color="gray400">
                            Motivo: {row.motivo}
                        </Text>
                    )}

                    {row.tentativa && (
                        <Text preset="text12" color="gray400">
                            {row.tentativa}
                        </Text>
                    )}

                    {/* A frase existe para o motorista não procurar uma parada que
                        já não está na lista — é o sintoma que ele relata. */}
                    {row.foraDaRota && (
                        <Text preset="text12" color="gray400">
                            Esta parada saiu da rota.
                        </Text>
                    )}
                </Box>
            ))}
        </Box>
    )
}
