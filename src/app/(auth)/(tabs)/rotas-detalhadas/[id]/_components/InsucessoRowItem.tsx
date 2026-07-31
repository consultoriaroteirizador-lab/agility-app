/**
 * InsucessoRowItem - Linha do "Concluídas com insucesso" da rota.
 *
 * Renderiza uma linha unificada do ledger de não-entregues: pedidos que ficaram
 * na rota (insucesso) e pedidos que saíram dela (cancelados / devolvidos à fila).
 * Exibe o DESFECHO (outcome) + o MOTIVO (reasonName) — antes o motivo não era
 * mostrado nesta tela.
 *
 * Navegação: linhas com `onPress` (as que ainda têm uma parada ao vivo na rota —
 * ex. FAILED) abrem a parada em modo leitura, como antes. Itens só-ledger
 * (cancelados/devolvidos) já não pertencem à rota → sem `onPress` (read-only).
 */

import { Box, Text, TouchableOpacityBox } from '@/components'
import { formatDatePtBr, formatHHmm } from '@/functions/dateFunctions'
import { measure } from '@/theme'

import type { InsucessoRow } from '../_utils'
import { formatNotasLabel, outcomeLabel } from '../_utils'

export interface InsucessoRowItemProps {
    row: InsucessoRow
    /** Quando presente, a linha é tocável e abre a parada ao vivo (leitura). */
    onPress?: () => void
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

export function InsucessoRowItem({ row, onPress }: InsucessoRowItemProps) {
    const label = outcomeLabel(row.outcome)
    const quando = formatOccurredAt(row.occurredAt)
    const titulo = row.recipientName ?? row.code ?? 'Pedido'
    // A linha é sempre de insucesso, então "misto" é simplesmente ter alguma nota
    // entregue. Mesma frase do card da lista — a formatação tem um dono só.
    const notasLabel = formatNotasLabel(row.totalNotas, row.notasEntregues, row.notasEntregues > 0)

    // Box quando read-only, TouchableOpacityBox quando navegável. O cast alinha os
    // tipos (Box não declara onPress; em runtime um onPress undefined é ignorado).
    const Container = (onPress ? TouchableOpacityBox : Box) as typeof TouchableOpacityBox

    return (
        <Container
            onPress={onPress}
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
                {/* Porta agrupada com insucesso parcial: "3 de 5 entregues" (§3.3).
                    É o recorte que não esconde do operador que a porta foi
                    parcialmente atendida — sem ele a linha diria só "Insucesso"
                    para uma parada em que a maioria das notas foi entregue. */}
                {notasLabel && (
                    <Box
                        backgroundColor="gray100"
                        paddingHorizontal="x8"
                        paddingVertical="y2"
                        borderRadius="s4"
                        flexShrink={0}
                    >
                        <Text preset="text13" color="gray600">
                            {notasLabel}
                        </Text>
                    </Box>
                )}
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
        </Container>
    )
}
