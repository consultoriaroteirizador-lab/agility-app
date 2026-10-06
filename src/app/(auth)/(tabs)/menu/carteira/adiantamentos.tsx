// src/app/(auth)/(tabs)/menu/carteira/adiantamentos.tsx

import React, { useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ActivityIndicator, Box, ButtonBack, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { useGetAdvancesSummary, useInfiniteAdvances, useWithdrawalAllowance } from '@/domain/agility/wallet';
import type { AdvanceResponse } from '@/domain/agility/wallet/dto';
import type { AdvancesFilter } from '@/domain/agility/wallet/useCase/useInfiniteWalletLists';
import { AdvanceStatus } from '@/domain/agility/wallet/dto/types';
import { measure, StatusColorConfig } from '@/theme';
import { colors } from '@/theme/colors';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

import { PolicyNoticeBox } from './_components/PolicyNoticeBox';
import { advanceCancelText, advanceContext, advanceDueText, advanceOverdueText, advanceTitle } from './_utils/advanceDisplay';
import { withdrawalPolicyNotice } from './_utils/debtPolicy';

const STATUS_CONFIG: Record<AdvanceStatus, StatusColorConfig> = {
    [AdvanceStatus.PENDING]: { label: 'Pendente', textColor: 'yellow100', bgColor: 'yellow20' },
    [AdvanceStatus.PARTIAL]: { label: 'Parcial', textColor: 'blue500', bgColor: 'primary20' },
    [AdvanceStatus.RETURNED]: { label: 'Devolvido', textColor: 'tertiary100', bgColor: 'tertiary20' },
    [AdvanceStatus.CANCELLED]: { label: 'Cancelado', textColor: 'gray400', bgColor: 'gray50' },
};

function AdvanceItem({ item }: { item: AdvanceResponse }) {
    const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG[AdvanceStatus.PENDING];
    const due = advanceDueText(item);
    const open = item.status === AdvanceStatus.PENDING || item.status === AdvanceStatus.PARTIAL;
    const cancelText = advanceCancelText(item);
    const contexto = advanceContext(item);

    return (
        <Box p="m16" borderRadius="s12" mb="b12" borderWidth={1} borderColor="borderColor">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Box flex={1}>
                    <Text testID={`titulo-${item.id}`} fontSize={measure.m14} fontWeightPreset="semibold" numberOfLines={2}>
                        {advanceTitle(item)}
                    </Text>
                    <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                        {formatDate(item.createdAt)}
                    </Text>
                    {contexto.customer && (
                        <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2" numberOfLines={1}>
                            {`Cliente: ${contexto.customer}`}
                        </Text>
                    )}
                    {contexto.route && (
                        <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2" numberOfLines={1}>
                            {`Rota: ${contexto.route}`}
                        </Text>
                    )}
                </Box>
                <Box px="x8" py="y4" borderRadius="s4" bg={config.bgColor}>
                    <Text fontSize={measure.m12} fontWeightPreset="semibold" color={config.textColor}>
                        {config.label}
                    </Text>
                </Box>
            </Box>

            <Box flexDirection="row" justifyContent="space-between" mt="t12" pt="t12" borderTopWidth={1} borderTopColor="borderColor">
                <Box>
                    <Text fontSize={11} color="colorTextSecondary">
                        Valor total
                    </Text>
                    <Text fontSize={measure.m16} fontWeightPreset="bold">
                        {formatCurrency(item.amount)}
                    </Text>
                </Box>
                <Box alignItems="flex-end">
                    <Text fontSize={11} color="colorTextSecondary">
                        Falta devolver
                    </Text>
                    <Text fontSize={measure.m16} fontWeightPreset="bold" color={open ? 'colorTextWarning' : 'colorTextSecondary'}>
                        {formatCurrency(item.pendingAmount)}
                    </Text>
                </Box>
            </Box>

            {open && due && (
                <Box flexDirection="row" alignItems="center" mt="t12">
                    {item.isOverdue && <Ionicons name="alert-circle" size={16} color={colors.redError} />}
                    <Text testID={`vencimento-${item.id}`} ml={item.isOverdue ? 'l6' : 'l0'} fontSize={measure.m12} color={item.isOverdue ? 'colorTextError' : 'colorTextSecondary'}>
                        {item.isOverdue ? advanceOverdueText(item) : due}
                    </Text>
                </Box>
            )}

            {cancelText && (
                <Text testID={`cancelamento-${item.id}`} mt="t12" fontSize={measure.m12} color="colorTextSecondary">
                    {cancelText}
                </Text>
            )}
        </Box>
    );
}

export default function AdiantamentosScreen() {
    // F5c R6: abre nas dívidas em aberto; "Todas" mostra o histórico (devolvidas e canceladas).
    const [filtro, setFiltro] = useState<AdvancesFilter>('open');
    const { items, isLoading, isError, isFetchNextPageError, isFetchingNextPage, loadMore, refetch, isRefreshing } = useInfiniteAdvances(filtro);
    const { summary, isError: isSummaryError, refetch: refetchSummary } = useGetAdvancesSummary();

    const { allowance } = useWithdrawalAllowance();
    const policyNotice = withdrawalPolicyNotice(allowance, summary?.overdueCount ?? null);
    const aviso = policyNotice ? <PolicyNoticeBox notice={policyNotice} /> : null;

    const resumo = !summary ? (
        isSummaryError ? (
            <TouchableOpacityBox testID="resumo-erro" mt="t16" p="m16" borderRadius="s12" backgroundColor="gray50" onPress={() => void refetchSummary()} accessibilityRole="button">
                <Text fontSize={measure.m13} color="colorTextError">
                    Não foi possível carregar o total a devolver. Toque para tentar de novo.
                </Text>
            </TouchableOpacityBox>
        ) : null
    ) : summary.count > 0 ? (
        <Box mt="t16" p="m16" borderRadius="s12">
            <Box flexDirection="row" justifyContent="space-between">
                <Box>
                    <Text fontSize={measure.m12} color="colorTextSecondary">
                        Total a devolver
                    </Text>
                    <Text testID="resumo-total" fontSize={measure.m20} fontWeight="bold" color="colorTextWarning">
                        {formatCurrency(summary.totalPending)}
                    </Text>
                </Box>
                <Box alignItems="flex-end">
                    <Text fontSize={measure.m12} color="colorTextSecondary">
                        {`${summary.count} em aberto`}
                    </Text>
                    {summary.overdueCount > 0 && (
                        <Text mt="t4" fontSize={measure.m12} color="colorTextError">
                            {`${summary.overdueCount} vencido(s)`}
                        </Text>
                    )}
                </Box>
            </Box>
        </Box>
    ) : null;

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Adiantamentos</Text>}>
            {aviso}
            {resumo}
            <Box flexDirection="row" gap="x8" px="x16" mt="t16">
                {([['open', 'Em aberto'], ['all', 'Todas']] as const).map(([valor, rotulo]) => (
                    <TouchableOpacityBox
                        key={valor}
                        testID={valor === 'open' ? 'filtro-em-aberto' : 'filtro-todas'}
                        onPress={() => setFiltro(valor)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: filtro === valor }}
                        px="x12"
                        py="y8"
                        borderRadius="s20"
                        borderWidth={1}
                        borderColor={filtro === valor ? 'primary100' : 'borderColor'}
                        backgroundColor={filtro === valor ? 'primary10' : undefined}
                    >
                        <Text fontSize={measure.m13} fontWeightPreset={filtro === valor ? 'semibold' : undefined}>
                            {rotulo}
                        </Text>
                    </TouchableOpacityBox>
                ))}
            </Box>
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AdvanceItem item={item} />}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => {
                            refetch();
                            void refetchSummary();
                        }}
                    />
                }
                onEndReached={isFetchNextPageError ? undefined : loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    isLoading ? (
                        <Box py="y32" alignItems="center">
                            <ActivityIndicator size="large" />
                        </Box>
                    ) : isError ? (
                        <Box testID="adiantamentos-erro" py="y32" alignItems="center">
                            <Text color="colorTextSecondary" textAlign="center">
                                Não foi possível carregar os adiantamentos.
                            </Text>
                            <TouchableOpacityBox mt="t16" onPress={refetch} accessibilityRole="button">
                                <Text color="colorTextPrimary">Tentar novamente</Text>
                            </TouchableOpacityBox>
                        </Box>
                    ) : (
                        <Box testID="adiantamentos-vazio" py="y32" alignItems="center">
                            <Ionicons name="checkmark-circle-outline" size={48} color={colors.greenSuccess} />
                            <Text mt="t12" color="colorTextSecondary" textAlign="center">
                                {filtro === 'open' ? 'Nenhuma dívida em aberto.' : 'Nenhum adiantamento.'}
                            </Text>
                        </Box>
                    )
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <Box py="y16" alignItems="center">
                            <ActivityIndicator size="small" />
                        </Box>
                    ) : isFetchNextPageError ? (
                        <TouchableOpacityBox py="y16" alignItems="center" onPress={loadMore} accessibilityRole="button">
                            <Text fontSize={measure.m13} color="colorTextError">
                                Falha ao carregar mais. Toque para tentar de novo.
                            </Text>
                        </TouchableOpacityBox>
                    ) : null
                }
            />
        </ScreenBase>
    );
}
