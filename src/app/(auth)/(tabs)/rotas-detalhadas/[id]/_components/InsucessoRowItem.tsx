/**
 * InsucessoRowItem - Linha (read-only) do "Concluídas com insucesso" da rota.
 *
 * Renderiza uma linha unificada do ledger de não-entregues: pedidos que ficaram
 * na rota (insucesso) e pedidos que saíram dela (cancelados / devolvidos à fila).
 * Exibe o DESFECHO (outcome) + o MOTIVO (reasonName) — antes o motivo não era
 * mostrado nesta tela. É read-only: itens cancelados/devolvidos já não pertencem
 * à rota, então não há navegação para a parada.
 */

import { Box, Text } from '@/components'
import { formatDatePtBr, formatHHmm } from '@/functions/dateFunctions'
import { measure } from '@/theme'

import type { InsucessoRow } from '../_utils'
import { outcomeLabel } from '../_utils'

export interface InsucessoRowItemProps {
    row: InsucessoRow
}

function formatOccurredAt(occurredAt: string | null): string | null {
    if (!occurredAt) return null
    const date = new Date(occurredAt)
    if (isNaN(date.getTime())) return null
    const dia = formatDatePtBr(date)
    const hora = formatHHmm(date)
    if (!dia) return hora
    return `${dia} ${hora}`
}

export function InsucessoRowItem({ row }: InsucessoRowItemProps) {
    const label = outcomeLabel(row.outcome)
    const quando = formatOccurredAt(row.occurredAt)
    const titulo = row.recipientName ?? row.code ?? 'Pedido'

    return (
        <Box
            backgroundColor="white"
            borderRadius="s12"
            paddingVertical="y16"
            paddingHorizontal="x16"
            borderWidth={measure.m1}
            borderColor="redError"
            gap="x8"
        >
            <Box flexDirection="row" alignItems="center" flexWrap="wrap" gap="x8">
                <Box
                    backgroundColor="redError"
                    paddingHorizontal="x8"
                    paddingVertical="y2"
                    borderRadius="s4"
                    flexShrink={0}
                >
                    <Text preset="text13" color="white">
                        ✕ {label}
                    </Text>
                </Box>
                {row.code && (
                    <Box
                        backgroundColor="gray200"
                        paddingHorizontal="x6"
                        paddingVertical="y2"
                        borderRadius="s4"
                        flexShrink={0}
                    >
                        <Text preset="text10" fontWeightPreset="bold" color="gray600">
                            {row.code}
                        </Text>
                    </Box>
                )}
            </Box>

            <Text
                preset="text14"
                color="gray600"
                fontWeightPreset="bold"
                numberOfLines={2}
                ellipsizeMode="tail"
            >
                {titulo}
            </Text>

            {row.address && (
                <Text preset="text13" color="gray400" numberOfLines={1} ellipsizeMode="tail">
                    {row.address}
                </Text>
            )}

            {row.reasonName && (
                <Box flexDirection="row" alignItems="center" gap="x4">
                    <Text preset="text12" color="gray400">
                        Motivo:
                    </Text>
                    <Text preset="text12" color="gray600" fontWeightPreset="bold">
                        {row.reasonName}
                    </Text>
                </Box>
            )}

            {quando && (
                <Text preset="text12" color="gray400">
                    🕓 {quando}
                </Text>
            )}
        </Box>
    )
}
