// src/app/(auth)/(tabs)/menu/ganhos/cobrancas.tsx

import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { format } from 'date-fns';
import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, ButtonBack, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { useInfinitePayments } from '@/domain/agility/finance';
import type { PaymentResponse } from '@/domain/agility/finance';
import { useGetAdvancesSummary } from '@/domain/agility/wallet';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

import { debtCardState, describePayment } from './_utils/paymentDisplay';
import { Period, PERIODS, periodStart } from './_utils/period';

function PaymentItem({ item }: { item: PaymentResponse }) {
    const d = describePayment(item);
    return (
        <Box p="m12" mb="b12" borderRadius="s12" borderWidth={1} borderColor="borderColor">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Text fontSize={measure.m14} fontWeightPreset="bold" numberOfLines={1} flex={1} mr="r8">
                    {d.title}
                </Text>
                <Box px="x8" py="y4" borderRadius="s4" bg={d.status.bgColor}>
                    <Text fontSize={measure.m12} fontWeightPreset="semibold" color={d.status.textColor}>
                        {d.status.label}
                    </Text>
                </Box>
            </Box>
            {d.subtitle && (
                <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4" numberOfLines={1}>
                    {d.subtitle}
                </Text>
            )}
            {d.route && (
                <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                    {`Rota: ${d.route}`}
                </Text>
            )}
            <Box flexDirection="row" justifyContent="space-between" mt="t8">
                <Text fontSize={measure.m12} color="colorTextSecondary">
                    {formatDate(d.date)}
                </Text>
                <Text fontSize={measure.m14} fontWeightPreset="bold">
                    {formatCurrency(d.amountCents)}
                </Text>
            </Box>
        </Box>
    );
}

export default function CobrancasScreen() {
    const router = useRouter();
    const [period, setPeriod] = useState<Period>('month');
    const startDate = useMemo(() => format(periodStart(period), 'yyyy-MM-dd'), [period]);
    const range = useMemo(() => ({ startDate }), [startDate]);
    const { items, isLoading, isError, isFetchNextPageError, isFetchingNextPage, loadMore, refetch, isRefreshing } = useInfinitePayments(range);
    const { summary, isError: isSummaryError, refetch: refetchSummary } = useGetAdvancesSummary();
    const debt = debtCardState(summary, isSummaryError);

    const header = (
        <Box>
            <Text fontSize={measure.m12} color="colorTextSecondary" mb="b12">
                O que você recebeu dos clientes na entrega. Esse dinheiro é da empresa: não entra nos seus ganhos.
            </Text>

            {debt.kind === 'error' ? (
                <TouchableOpacityBox testID="divida-erro" p="m16" borderRadius="s12" backgroundColor="gray50" onPress={() => void refetchSummary()}>
                    <Text fontSize={measure.m13} color="colorTextError">
                        Não foi possível carregar o que você deve devolver. Toque para tentar de novo.
                    </Text>
                </TouchableOpacityBox>
            ) : debt.kind === 'debt' ? (
                <TouchableOpacityBox p="m16" borderRadius="s12" backgroundColor="gray50" onPress={() => router.push('/menu/carteira/adiantamentos')}>
                    <Text fontSize={measure.m13} color="colorTextSecondary">
                        Dinheiro a devolver à empresa
                    </Text>
                    <Text fontSize={measure.m20} fontWeightPreset="bold" color={debt.overdueCount > 0 ? 'colorTextError' : 'colorTextWarning'}>
                        {formatCurrency(debt.totalCents)}
                    </Text>
                    <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                        {debt.overdueCount > 0 ? `${debt.overdueCount} vencido(s). Toque para ver os vencimentos.` : 'Toque para ver os vencimentos.'}
                    </Text>
                </TouchableOpacityBox>
            ) : debt.kind === 'none' ? (
                <Text fontSize={measure.m13} color="colorTextSecondary">
                    Você não tem dinheiro a devolver.
                </Text>
            ) : null}

            <Box flexDirection="row" justifyContent="space-between" py="y12">
                {PERIODS.map((option) => (
                    <TouchableOpacityBox
                        key={option.value}
                        flex={1}
                        backgroundColor={period === option.value ? 'primary100' : 'gray50'}
                        borderRadius="s10"
                        padding="m12"
                        marginHorizontal="x4"
                        onPress={() => setPeriod(option.value)}
                    >
                        <Text fontSize={measure.m12} color={period === option.value ? 'white' : 'colorTextSecondary'} textAlign="center">
                            {option.label}
                        </Text>
                    </TouchableOpacityBox>
                ))}
            </Box>
        </Box>
    );

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Cobranças</Text>}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <PaymentItem item={item} />}
                ListHeaderComponent={header}
                contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
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
                            <ActivityIndicator />
                        </Box>
                    ) : isError ? (
                        <Box py="y32" alignItems="center">
                            <Text color="colorTextSecondary" textAlign="center">
                                Não foi possível carregar as cobranças.
                            </Text>
                            <TouchableOpacityBox mt="t16" onPress={refetch}>
                                <Text color="colorTextPrimary">Tentar novamente</Text>
                            </TouchableOpacityBox>
                        </Box>
                    ) : (
                        <Box py="y32" alignItems="center">
                            <Text color="colorTextSecondary" textAlign="center">
                                Nenhuma cobrança neste período.
                            </Text>
                        </Box>
                    )
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <Box py="y16" alignItems="center">
                            <ActivityIndicator />
                        </Box>
                    ) : isFetchNextPageError ? (
                        <TouchableOpacityBox py="y16" alignItems="center" onPress={loadMore}>
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
