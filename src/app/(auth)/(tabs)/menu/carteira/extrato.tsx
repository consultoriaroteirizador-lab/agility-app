// src/app/(auth)/(tabs)/menu/carteira/extrato.tsx

import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, RefreshControl, ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ActivityIndicator, Box, ButtonBack, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { isRemoteUrl } from '@/domain/agility/chat/utils/messageUtils';
import { useInfiniteTransactions } from '@/domain/agility/wallet';
import type { TransactionResponse } from '@/domain/agility/wallet/dto';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { formatDate } from '@/utils/formatDate';

import { describeTransaction, EXTRATO_FILTERS, ExtratoFilter, filterTransactions, transactionTitle } from './_utils/transactionDisplay';

function TransactionItem({ item }: { item: TransactionResponse }) {
    const display = describeTransaction(item);
    const { showToast } = useToastService();

    // So URL http(s) abre. O backend assina a URL na listagem; se vier a CHAVE
    // crua (storage fora, falha ao assinar), o link nao aparece — melhor nao ter
    // botao do que ter um botao que da erro na cara do motorista.
    const comprovantes = (item.proofUrls ?? []).filter(isRemoteUrl);

    const abrirComprovante = useCallback(
        (url: string) => {
            Linking.openURL(url).catch(() => {
                showToast({ message: 'Nao foi possivel abrir o comprovante', type: 'error' });
            });
        },
        [showToast],
    );

    return (
        <Box py="y12" borderRadius="s12" mb="b8">
            <Box flexDirection="row" alignItems="center">
                <Box
                    width={measure.x40}
                    height={measure.y40}
                    borderRadius="s20"
                    alignItems="center"
                    justifyContent="center"
                    style={{ backgroundColor: display.bgColor }}
                >
                    <Ionicons name={display.icon} size={measure.m20} color={display.iconColor} />
                </Box>

                <Box flex={1} ml="l12">
                    <Text testID={`titulo-${item.id}`} fontSize={measure.m14} fontWeightPreset="semibold" numberOfLines={1}>
                        {transactionTitle(item.description, display.label)}
                    </Text>
                    <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                        {`${display.label} • ${formatDate(item.createdAt)}`}
                    </Text>
                    {display.movement && (
                        <Text testID={`movimento-${item.id}`} fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                            {display.movement}
                        </Text>
                    )}
                </Box>

                <Box alignItems="flex-end">
                    <Text testID={`valor-${item.id}`} fontSize={measure.m16} fontWeightPreset="bold" color={display.amountColor}>
                        {display.amountText}
                    </Text>
                    {display.badge && (
                        <Box mt="t4" px="x8" py="y4" borderRadius="s4" bg={display.badge.bgColor}>
                            <Text testID={`status-${item.id}`} fontSize={measure.m12} fontWeightPreset="semibold" color={display.badge.textColor}>
                                {display.badge.label}
                            </Text>
                        </Box>
                    )}
                </Box>
            </Box>

            {comprovantes.length > 0 && (
                <Box flexDirection="row" flexWrap="wrap" gap="x8" mt="t8" ml="l12">
                    {comprovantes.map((url, indice) => (
                        <TouchableOpacityBox
                            key={url}
                            testID={`comprovante-${item.id}-${indice}`}
                            flexDirection="row"
                            alignItems="center"
                            px="m12"
                            py="y8"
                            borderRadius="s12"
                            backgroundColor="gray50"
                            accessibilityRole="link"
                            accessibilityLabel="Abrir comprovante"
                            onPress={() => abrirComprovante(url)}
                        >
                            <Ionicons name="receipt-outline" size={measure.m16} color="#666" />
                            <Text fontSize={measure.m12} color="colorTextSecondary" ml="l8">
                                {comprovantes.length === 1 ? 'Ver comprovante' : `Comprovante ${indice + 1}`}
                            </Text>
                        </TouchableOpacityBox>
                    ))}
                </Box>
            )}
        </Box>
    );
}

export default function ExtratoScreen() {
    const [filter, setFilter] = useState<ExtratoFilter>('all');
    const {
        items: transactions,
        isLoading,
        isError,
        isFetchNextPageError,
        hasNextPage,
        isFetchingNextPage,
        loadMore,
        refetch,
        isRefreshing,
    } = useInfiniteTransactions();

    const visible = useMemo(() => filterTransactions(transactions, filter), [transactions, filter]);
    const title = <Text preset="textTitleScreen">Extrato</Text>;

    if (isLoading) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    // Erro sem nada carregado NÃO é "nenhuma movimentação" (auditoria, Bug 9).
    if (isError && transactions.length === 0) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box testID="extrato-erro" flex={1} justifyContent="center" alignItems="center" px="x24">
                    <Ionicons name="cloud-offline-outline" size={48} color="#999" />
                    <Text mt="t12" color="colorTextSecondary" textAlign="center">
                        Não foi possível carregar o extrato.
                    </Text>
                    <TouchableOpacityBox mt="t16" onPress={refetch} accessibilityRole="button">
                        <Text color="colorTextPrimary">Tentar novamente</Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    const filterLabel = EXTRATO_FILTERS.find((f) => f.value === filter)?.label.toLowerCase();

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={title}>
            <Box py="y12" borderBottomWidth={1} borderBottomColor="borderColor">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Box flexDirection="row" gap="x8">
                        {EXTRATO_FILTERS.map((option) => (
                            <TouchableOpacityBox
                                key={option.value}
                                testID={`filtro-${option.value}`}
                                px="m12"
                                py="y8"
                                borderRadius="s20"
                                backgroundColor={filter === option.value ? 'primary100' : 'gray50'}
                                onPress={() => setFilter(option.value)}
                            >
                                <Text
                                    fontSize={measure.m13}
                                    fontWeightPreset={filter === option.value ? 'semibold' : 'regular'}
                                    color={filter === option.value ? 'white' : 'colorTextSecondary'}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacityBox>
                        ))}
                    </Box>
                </ScrollView>
            </Box>

            <FlatList
                data={visible}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <TransactionItem item={item} />}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} />}
                // Com a próxima página em erro, rolar não dispara de novo: o rodapé oferece o retry.
                onEndReached={isFetchNextPageError ? undefined : loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    <Box py="y32" alignItems="center" px="x16">
                        <Ionicons name="document-text-outline" size={48} color="#999" />
                        <Text testID="extrato-vazio" mt="t12" color="colorTextSecondary" textAlign="center">
                            {filter === 'all'
                                ? 'Nenhuma movimentação ainda.'
                                : `Nenhuma movimentação de ${filterLabel} entre as carregadas.`}
                        </Text>
                        {filter !== 'all' && hasNextPage && (
                            <TouchableOpacityBox
                                testID="extrato-carregar-mais"
                                mt="t16"
                                px="x16"
                                py="y8"
                                borderRadius="s8"
                                backgroundColor="primary100"
                                onPress={loadMore}
                            >
                                <Text fontSize={measure.m14} fontWeightPreset="semibold" color="white">
                                    Carregar mais antigas
                                </Text>
                            </TouchableOpacityBox>
                        )}
                    </Box>
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <Box py="y16" alignItems="center">
                            <ActivityIndicator />
                        </Box>
                    ) : isFetchNextPageError ? (
                        <TouchableOpacityBox testID="extrato-erro-mais" py="y16" alignItems="center" onPress={loadMore}>
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
