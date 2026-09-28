// src/app/(auth)/(tabs)/menu/carteira/saques.tsx

import React, { useCallback } from 'react';
import { FlatList, Linking, RefreshControl } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ActivityIndicator, Box, ButtonBack, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { isRemoteUrl } from '@/domain/agility/chat/utils/messageUtils';
import { useInfiniteWithdrawals } from '@/domain/agility/wallet';
import type { WithdrawalResponse } from '@/domain/agility/wallet/dto';
import { WithdrawalStatus } from '@/domain/agility/wallet/dto/types';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

import { describeWithdrawal } from './_utils/withdrawalDisplay';

function WithdrawalItem({ item }: { item: WithdrawalResponse }) {
    const display = describeWithdrawal(item);
    const { showToast } = useToastService();
    const comprovantes = (item.proofUrls ?? []).filter(isRemoteUrl);

    const abrir = useCallback(
        (url: string) => {
            Linking.openURL(url).catch(() => showToast({ message: 'Nao foi possivel abrir o comprovante', type: 'error' }));
        },
        [showToast],
    );

    return (
        <Box p="m16" borderRadius="s12" mb="b12" borderWidth={1} borderColor="borderColor">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Box>
                    <Text fontSize={measure.m16} fontWeightPreset="bold">
                        {formatCurrency(item.amount)}
                    </Text>
                    <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                        {`Pedido em ${formatDate(item.createdAt)}`}
                    </Text>
                </Box>
                <Box px="x8" py="y4" borderRadius="s4" bg={display.status.bgColor}>
                    <Text fontSize={measure.m12} fontWeightPreset="semibold" color={display.status.textColor}>
                        {display.status.label}
                    </Text>
                </Box>
            </Box>

            <Text fontSize={measure.m12} color="colorTextSecondary" mt="t8">
                {display.destination}
            </Text>
            {item.status === WithdrawalStatus.COMPLETED && !!item.processedAt && (
                <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                    {`Pago em ${formatDate(item.processedAt)}`}
                </Text>
            )}
            {display.note && (
                <Text fontSize={measure.m12} color={item.status === WithdrawalStatus.CANCELLED ? 'colorTextError' : 'colorTextWarning'} mt="t8">
                    {display.note}
                </Text>
            )}

            {comprovantes.map((url, indice) => (
                <TouchableOpacityBox
                    key={url}
                    mt="t8"
                    flexDirection="row"
                    alignItems="center"
                    accessibilityRole="link"
                    accessibilityLabel="Abrir comprovante"
                    onPress={() => abrir(url)}
                >
                    <Ionicons name="receipt-outline" size={measure.m16} color="#666" />
                    <Text fontSize={measure.m12} color="colorTextSecondary" ml="l8">
                        {comprovantes.length === 1 ? 'Ver comprovante' : `Comprovante ${indice + 1}`}
                    </Text>
                </TouchableOpacityBox>
            ))}
        </Box>
    );
}

export default function MeusSaquesScreen() {
    const { items, isLoading, isError, isFetchNextPageError, isFetchingNextPage, loadMore, refetch, isRefreshing } = useInfiniteWithdrawals();
    const title = <Text preset="textTitleScreen">Meus saques</Text>;

    if (isLoading) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    if (isError && items.length === 0) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box flex={1} justifyContent="center" alignItems="center" px="x24">
                    <Text textAlign="center" color="colorTextSecondary">
                        Não foi possível carregar seus saques.
                    </Text>
                    <TouchableOpacityBox mt="t16" onPress={refetch} accessibilityRole="button">
                        <Text color="colorTextPrimary">Tentar novamente</Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={title}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <WithdrawalItem item={item} />}
                contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} />}
                onEndReached={isFetchNextPageError ? undefined : loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    <Box py="y32" alignItems="center">
                        <Text color="colorTextSecondary" textAlign="center">
                            Você ainda não pediu nenhum saque.
                        </Text>
                    </Box>
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <Box py="y16" alignItems="center">
                            <ActivityIndicator />
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
