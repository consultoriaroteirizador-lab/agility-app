// src/app/(auth)/(tabs)/menu/carteira/extrato.tsx

import React, { useState, useMemo } from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ActivityIndicator, Box, ButtonBack, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { useGetTransactions } from '@/domain/agility/wallet';
import { TransactionResponse } from '@/domain/agility/wallet/dto';
import { TransactionType } from '@/domain/agility/wallet/dto/types';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

// Tipos de filtro
type FilterType = 'all' | 'earnings' | 'advances' | 'withdrawals';

// Configuração completa de cada tipo de transação
interface TransactionConfig {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    bgColor: string;
    category: 'earnings' | 'advances' | 'withdrawals' | 'other';
}

const TRANSACTION_CONFIG: Record<TransactionType, TransactionConfig> = {
    [TransactionType.CREDIT]: {
        label: 'Crédito',
        icon: 'add-circle',
        iconColor: '#4CAF50',
        bgColor: '#E8F5E9',
        category: 'earnings',
    },
    [TransactionType.UBERIZATION]: {
        label: 'Uberização',
        icon: 'car',
        iconColor: '#9C27B0',
        bgColor: '#F3E5F5',
        category: 'earnings',
    },
    [TransactionType.DEBIT]: {
        label: 'Débito',
        icon: 'remove-circle',
        iconColor: '#F44336',
        bgColor: '#FFEBEE',
        category: 'withdrawals',
    },
    [TransactionType.REFUND]: {
        label: 'Estorno',
        icon: 'refresh',
        iconColor: '#2196F3',
        bgColor: '#E3F2FD',
        category: 'earnings',
    },
    [TransactionType.ADJUSTMENT]: {
        label: 'Ajuste',
        icon: 'create',
        iconColor: '#607D8B',
        bgColor: '#ECEFF1',
        category: 'other',
    },
    [TransactionType.ADVANCE]: {
        label: 'Adiantamento',
        icon: 'arrow-forward',
        iconColor: '#FF9800',
        bgColor: '#FFF3E0',
        category: 'advances',
    },
    [TransactionType.ADVANCE_RETURN]: {
        label: 'Devolução',
        icon: 'arrow-back',
        iconColor: '#FF5722',
        bgColor: '#FBE9E7',
        category: 'advances',
    },
    [TransactionType.COMMISSION]: {
        label: 'Comissão',
        icon: 'cash',
        iconColor: '#4CAF50',
        bgColor: '#E8F5E9',
        category: 'earnings',
    },
    [TransactionType.BONUS]: {
        label: 'Bônus',
        icon: 'gift',
        iconColor: '#E91E63',
        bgColor: '#FCE4EC',
        category: 'earnings',
    },
};

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'earnings', label: 'Ganhos' },
    { value: 'advances', label: 'Adiantamentos' },
    { value: 'withdrawals', label: 'Saques' },
];

function TransactionItem({ item }: { item: TransactionResponse }) {
    const config = TRANSACTION_CONFIG[item.type] || TRANSACTION_CONFIG[TransactionType.CREDIT];
    const isCredit = item.isCredit;

    return (
        <Box
            flexDirection="row"
            alignItems="center"
            py="y12"
            borderRadius="s12"
            mb="b8"
        >
            <Box
                width={measure.x40}
                height={measure.y40}
                borderRadius="s20"
                backgroundColor="background"
                alignItems="center"
                justifyContent="center"
                style={{ backgroundColor: config.bgColor }}
            >
                <Ionicons
                    name={config.icon}
                    size={measure.m20}
                    color={config.iconColor}
                />
            </Box>

            <Box flex={1} ml="l12">
                <Text fontSize={measure.m14} fontWeightPreset='semibold' numberOfLines={1}>
                    {item.description}
                </Text>
                <Text fontSize={measure.m12} color="colorTextSecondary" mt="t2">
                    {config.label} • {formatDate(item.createdAt)}
                </Text>
            </Box>

            <Box alignItems="flex-end">
                <Text
                    fontSize={measure.m16}
                    fontWeightPreset='bold'
                    color={isCredit ? 'colorTextSuccess' : 'colorTextError'}
                >
                    {isCredit ? '+' : '-'}{formatCurrency(item.amount)}
                </Text>
            </Box>
        </Box>
    );
}

export default function ExtratoScreen() {
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<FilterType>('all');
    const { transactions, meta, isLoading, isError, refetch, isRefetching } = useGetTransactions({
        page,
        limit: 20,
    });

    // Filtrar transações por categoria
    const filteredTransactions = useMemo(() => {
        if (filter === 'all') return transactions;

        return transactions.filter(transaction => {
            const config = TRANSACTION_CONFIG[transaction.type];
            if (!config) return false;

            switch (filter) {
                case 'earnings':
                    return config.category === 'earnings';
                case 'advances':
                    return config.category === 'advances';
                case 'withdrawals':
                    return config.category === 'withdrawals';
                default:
                    return true;
            }
        });
    }, [transactions, filter]);

    const loadMore = () => {
        if (meta && page < meta.totalPages) {
            setPage(page + 1);
        }
    };

    if (isLoading && page === 1) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset='textTitleScreen'>Extrato</Text>}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset='textTitleScreen'>Extrato</Text>}>
            {/* Filtros */}
            <Box px="m16" py="y12" borderBottomWidth={1} borderBottomColor="borderColor">
                <Box flexDirection="row" gap="x8">
                    {FILTER_OPTIONS.map(option => (
                        <TouchableOpacityBox
                            key={option.value}
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
            </Box>

            <FlatList
                data={filteredTransactions}
                keyExtractor={(item) => item.id}
                renderItem={TransactionItem}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    <Box py="y32" alignItems="center">
                        <Ionicons name="document-text-outline" size={48} color="#999" />
                        <Text mt="t12" color="colorTextSecondary">
                            {filter === 'all'
                                ? 'Nenhuma transação encontrada'
                                : `Nenhuma transação de ${FILTER_OPTIONS.find(f => f.value === filter)?.label.toLowerCase()}`
                            }
                        </Text>
                    </Box>
                }
                ListFooterComponent={
                    isLoading && page > 1 ? (
                        <Box py="y16" alignItems="center">
                            <ActivityIndicator />
                        </Box>
                    ) : null
                }
            />
        </ScreenBase>
    );
}
