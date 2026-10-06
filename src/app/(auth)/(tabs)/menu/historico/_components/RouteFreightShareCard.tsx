// src/app/(auth)/(tabs)/menu/historico/_components/RouteFreightShareCard.tsx
import React from 'react';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { useDriverFreightShares } from '@/domain/agility/wallet';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

import { describeFreightShare } from '../../ganhos/_utils/freightShareDisplay';

/**
 * A parte do motorista nesta rota (F6, R9 da F5c). Vazio = a rota não tem frete para ele
 * (ex.: CLT fora de oferta): o cartão some. Erro não é vazio: avisa e tenta de novo.
 */
export function RouteFreightShareCard({ routingId }: { routingId: string }) {
    const { page, isError, refetch } = useDriverFreightShares({ routingId }, { enabled: !!routingId });

    if (isError) {
        return (
            <TouchableOpacityBox testID="parte-da-rota-erro" mb="b16" p="m12" borderRadius="s12" backgroundColor="gray50" onPress={() => void refetch()} accessibilityRole="button">
                <Text fontSize={measure.m13} color="colorTextError">
                    Não foi possível carregar sua parte nesta rota. Toque para tentar de novo.
                </Text>
            </TouchableOpacityBox>
        );
    }
    if (!page || page.data.length === 0) return null;

    return (
        <Box mb="b16" p="m12" borderRadius="s12" borderWidth={1} borderColor="borderColor">
            <Text fontSize={measure.m14} fontWeightPreset="bold" mb="b8">
                Sua parte nesta rota
            </Text>
            {page.data.map((s) => {
                const d = describeFreightShare(s);
                return (
                    <Box key={s.id} mt="t4">
                        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                            <Text fontSize={measure.m16} fontWeightPreset="bold">
                                {d.amountCents === null ? '—' : formatCurrency(d.amountCents)}
                            </Text>
                            <Box px="x8" py="y4" borderRadius="s4" bg={d.status.bgColor}>
                                <Text fontSize={measure.m12} fontWeightPreset="semibold" color={d.status.textColor}>
                                    {d.status.label}
                                </Text>
                            </Box>
                        </Box>
                        {d.stops && (
                            <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                                {d.stops}
                            </Text>
                        )}
                        {d.date && (
                            <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                                {`Liberado em ${formatDate(d.date)}`}
                            </Text>
                        )}
                        {d.note && (
                            <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                                {d.note}
                            </Text>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}
