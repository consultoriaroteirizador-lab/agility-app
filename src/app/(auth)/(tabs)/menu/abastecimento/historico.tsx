// src/app/(auth)/(tabs)/menu/abastecimento/historico.tsx

import React from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { ActivityIndicator, Box, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { FUEL_LABEL, formatFilledAt, formatLiters, inconsistencyText, useInfiniteMyFuelEntries, type FuelEntry } from '@/domain/agility/fuelEntry';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

function Linha({ item }: { item: FuelEntry }) {
    const aviso = inconsistencyText(item);
    const anulado = item.status === 'VOIDED';
    return (
        <Box py="y12" borderBottomWidth={1} borderColor="gray200" opacity={anulado ? 0.6 : 1}>
            <Box flexDirection="row" justifyContent="space-between">
                <Text fontWeightPreset="semibold">{formatFilledAt(item.filledAt)}</Text>
                <Text fontWeightPreset="semibold">{formatCurrency(item.totalValue, true)}</Text>
            </Box>
            <Text mt="t4" color="colorTextSecondary">{`${FUEL_LABEL[item.fuelType]} · ${formatLiters(item.liters)}`}</Text>
            {anulado && (
                <Text mt="t4" fontSize={measure.m12} color="colorTextSecondary">
                    {item.voidReason ? `Anulado pela central: ${item.voidReason}` : 'Anulado pela central'}
                </Text>
            )}
            {!anulado && aviso && (
                <Text mt="t4" fontSize={measure.m12} color="colorTextWarning">
                    {aviso}
                </Text>
            )}
        </Box>
    );
}

export default function MeusAbastecimentosScreen() {
    const { items, isLoading, isError, isFetchNextPageError, isFetchingNextPage, loadMore, refetch, isRefreshing } = useInfiniteMyFuelEntries();
    const titulo = <Text preset="textTitleScreen">Meus abastecimentos</Text>;

    if (isLoading) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={titulo}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    // Falhou a primeira página: "nenhum abastecimento" mentiria.
    if (isError && items.length === 0) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={titulo}>
                <Box flex={1} justifyContent="center" alignItems="center" p="m24">
                    <Text color="colorTextSecondary" textAlign="center">
                        Não foi possível carregar seus abastecimentos.
                    </Text>
                    <TouchableOpacityBox testID="historico-erro" accessibilityRole="button" mt="t16" p="m12" onPress={refetch}>
                        <Text color="colorTextPrimary" fontWeightPreset="semibold">
                            Tentar novamente
                        </Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={titulo}>
            <FlatList
                data={items}
                keyExtractor={(i) => i.id}
                renderItem={({ item }) => <Linha item={item} />}
                onEndReached={loadMore}
                onEndReachedThreshold={0.4}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} />}
                ListEmptyComponent={
                    <Box py="y40" alignItems="center">
                        <Text color="colorTextSecondary">Nenhum abastecimento registrado ainda.</Text>
                    </Box>
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <ActivityIndicator />
                    ) : isFetchNextPageError ? (
                        <TouchableOpacityBox p="m12" alignItems="center" onPress={loadMore}>
                            <Text color="colorTextPrimary">Falha ao carregar mais. Tocar para tentar de novo.</Text>
                        </TouchableOpacityBox>
                    ) : null
                }
            />
        </ScreenBase>
    );
}
