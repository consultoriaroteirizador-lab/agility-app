// src/app/(auth)/(tabs)/menu/carteira/adiantamentos.tsx

import React from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ActivityIndicator, Box, ButtonBack, ScreenBase, Text } from '@/components';
import { useGetAdvances, useGetAdvancesSummary } from '@/domain/agility/wallet';
import { AdvanceResponse } from '@/domain/agility/wallet/dto';
import { AdvanceStatus } from '@/domain/agility/wallet/dto/types';
import { measure, StatusColorConfig } from '@/theme';
import { colors } from '@/theme/colors';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';



const STATUS_CONFIG: Record<AdvanceStatus, StatusColorConfig> = {
    [AdvanceStatus.PENDING]: { label: 'Pendente', textColor: 'yellow100', bgColor: 'yellow20' },
    [AdvanceStatus.PARTIAL]: { label: 'Parcial', textColor: 'blue500', bgColor: 'primary20' },
    [AdvanceStatus.RETURNED]: { label: 'Devolvido', textColor: 'tertiary100', bgColor: 'tertiary20' },
    [AdvanceStatus.CANCELLED]: { label: 'Cancelado', textColor: 'gray400', bgColor: 'gray50' },
};

function AdvanceItem({ item }: { item: AdvanceResponse }) {
    const config = STATUS_CONFIG[item.status];

    return (
        <Box
            p="m16"
            borderRadius="s12"
            mb="b12"
        >
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Box flex={1}>
                    <Text fontSize={measure.m14} fontWeightPreset='semibold' numberOfLines={2}>
                        {item.description}
                    </Text>
                    <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                        {formatDate(item.createdAt)}
                    </Text>
                </Box>

                <Box
                    px="x8"
                    py="y4"
                    borderRadius="s4"
                    bg={config.bgColor}
                >
                    <Text fontSize={measure.m12} fontWeightPreset='semibold' color={config.textColor}>
                        {config.label}
                    </Text>
                </Box>
            </Box>

            <Box
                flexDirection="row"
                justifyContent="space-between"
                mt="t12"
                pt="t12"
                borderTopWidth={1}
                borderTopColor="borderColor"
            >
                <Box>
                    <Text fontSize={11} color="colorTextSecondary">Valor total</Text>
                    <Text fontSize={measure.m16} fontWeightPreset='bold'>{formatCurrency(item.amount)}</Text>
                </Box>

                <Box alignItems="flex-end">
                    <Text fontSize={11} color="colorTextSecondary">Pendente</Text>
                    <Text fontSize={measure.m16} fontWeightPreset='bold' color="colorTextWarning">
                        {formatCurrency(item.pendingAmount)}
                    </Text>
                </Box>
            </Box>

            {item.isOverdue && (
                <Box flexDirection="row" alignItems="center" mt="t12">
                    <Ionicons name="alert-circle" size={16} color={colors.redError} />
                    <Text ml="t6" fontSize={measure.m12} color="colorTextError">
                        Vencido
                    </Text>
                </Box>
            )}
        </Box>
    );
}

export default function AdiantamentosScreen() {
    const { advances, isLoading, refetch, isRefetching } = useGetAdvances();
    const { summary } = useGetAdvancesSummary();

    const pendingAdvances = advances.filter(a => a.status !== AdvanceStatus.RETURNED && a.status !== AdvanceStatus.CANCELLED);

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset='textTitleScreen'>Adiantamento</Text>}>

            {/* Summary */}
            {summary && summary.count > 0 && (
                <Box mt="t16">
                    <Box p="m16" borderRadius="s12">
                        <Box flexDirection="row" justifyContent="space-between">
                            <Box>
                                <Text fontSize={measure.m12} color="colorTextSecondary">Total pendente</Text>
                                <Text fontSize={measure.m20} fontWeight="bold" color="colorTextWarning">
                                    {formatCurrency(summary.totalPending)}
                                </Text>
                            </Box>
                            <Box alignItems="flex-end">
                                <Text fontSize={measure.m12} color="colorTextSecondary">
                                    {summary.count} adiantamento{summary.count !== 1 ? 's' : ''}
                                </Text>
                                {summary.overdueCount > 0 && (
                                    <Box flexDirection="row" alignItems="center" mt="t4">
                                        <Ionicons name="alert" size={14} color={colors.redError} />
                                        <Text ml="l4" fontSize={measure.m12} color="colorTextError">
                                            {summary.overdueCount} vencido{summary.overdueCount !== 1 ? 's' : ''}
                                        </Text>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            )}

            <FlatList
                data={pendingAdvances}
                keyExtractor={(item) => item.id}
                renderItem={AdvanceItem}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
                ListEmptyComponent={
                    isLoading ? (
                        <Box py="y32" alignItems="center">
                            <ActivityIndicator size="large" />
                        </Box>
                    ) : (
                        <Box py="y32" alignItems="center">
                            <Ionicons name="checkmark-circle-outline" size={48} color={colors.greenSuccess} />
                            <Text mt="t12" color="colorTextSecondary" textAlign="center">
                                Nenhum adiantamento pendente
                            </Text>
                        </Box>
                    )
                }
            />
        </ScreenBase>
    );
}
