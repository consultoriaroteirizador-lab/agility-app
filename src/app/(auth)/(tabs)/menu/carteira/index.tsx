// src/app/(auth)/(tabs)/menu/carteira/index.tsx

import React, { useCallback } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { useGetAdvancesSummary, useGetWallet } from '@/domain/agility/wallet';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function QuickAction({ icon, color, label, onPress }: { icon: IconName; color: string; label: string; onPress: () => void }) {
    return (
        <TouchableOpacityBox
            flex={1}
            p="m16"
            borderRadius="s12"
            alignItems="center"
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            <Ionicons name={icon} size={measure.m24} color={color} />
            <Text mt="t8" fontSize={measure.m14} fontWeightPreset="semibold" textAlign="center">
                {label}
            </Text>
        </TouchableOpacityBox>
    );
}

function Bucket({ label, value, id, warning }: { label: string; value: number; id: string; warning?: boolean }) {
    // O prop de entrada chama-se "id", não "testID": a instância do próprio Bucket também
    // seria encontrada por findAllByProps({ testID }) se o nome fosse igual, e o teste pegaria
    // o wrapper (sem "children") em vez do Text de dentro.
    return (
        <Box flex={1}>
            <Text fontSize={measure.m12} color="colorTextSecondary">
                {label}
            </Text>
            <Text testID={id} fontSize={measure.m16} fontWeightPreset="bold" mt="t4" color={warning ? 'colorTextWarning' : 'colorTextPrimary'}>
                {formatCurrency(value)}
            </Text>
        </Box>
    );
}

export default function CarteiraScreen() {
    const router = useRouter();
    const { wallet, isLoading, isError, refetch, isRefetching } = useGetWallet();
    const { summary: advances, isError: isAdvancesError, refetch: refetchAdvances } = useGetAdvancesSummary();
    const title = <Text preset="textTitleScreen">Carteira</Text>;

    const refresh = useCallback(() => {
        void refetch();
        void refetchAdvances();
    }, [refetch, refetchAdvances]);

    if (isLoading) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    if (isError || !wallet) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={title}>
                <Box flex={1} justifyContent="center" alignItems="center" px="x24">
                    <Ionicons name="wallet-outline" size={64} color="#999" />
                    <Text mt="t16" textAlign="center" color="colorTextSecondary">
                        Não foi possível carregar sua carteira.
                    </Text>
                    <TouchableOpacityBox mt="t16" onPress={refresh}>
                        <Text color="colorTextPrimary">Tentar novamente</Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    const hasOverdue = (advances?.overdueCount ?? 0) > 0;

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={title}>
            <ScrollView refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}>
                <Box>
                    {/* Os quatro números vêm prontos do GET /wallet (F2); nenhum é somado aqui. */}
                    <Box p="m20" borderRadius="s16">
                        <Text fontSize={measure.m14} color="colorTextSecondary">
                            Disponível para saque
                        </Text>
                        <Text testID="saldo-disponivel" fontSize={32} fontWeight="bold" mt="t8" color="colorTextPrimary">
                            {formatCurrency(wallet.availableBalance)}
                        </Text>

                        <Box flexDirection="row" mt="t16" gap="x24">
                            <Bucket label="Frete a liberar" value={wallet.freightPendingBalance ?? 0} id="frete-a-liberar" warning />
                            <Bucket label="Saque pendente" value={wallet.withdrawalPendingBalance ?? 0} id="saque-pendente" warning />
                        </Box>

                        <Box mt="t16">
                            <Bucket label="Total na carteira" value={wallet.balance} id="saldo-total" />
                            <Text fontSize={measure.m11} color="colorTextSecondary" mt="t4">
                                Disponível + frete a liberar + saque pendente.
                            </Text>
                        </Box>
                    </Box>

                    {/* Dívida: acerto separado (regra-mãe 3). Não sai do disponível. */}
                    {isAdvancesError && !advances ? (
                        <TouchableOpacityBox
                            testID="adiantamentos-erro"
                            mt="t16"
                            p="m16"
                            borderRadius="s12"
                            backgroundColor="gray50"
                            onPress={() => void refetchAdvances()}
                        >
                            <Text fontSize={measure.m13} color="colorTextError">
                                Não foi possível carregar o que você deve devolver. Toque para tentar de novo.
                            </Text>
                        </TouchableOpacityBox>
                    ) : advances && advances.totalPending > 0 ? (
                        <TouchableOpacityBox
                            mt="t16"
                            p="m16"
                            borderRadius="s12"
                            backgroundColor="gray50"
                            onPress={() => router.push('/menu/carteira/adiantamentos')}
                        >
                            <Box flexDirection="row" alignItems="center" justifyContent="space-between">
                                <Box flexDirection="row" alignItems="center">
                                    <Ionicons name={hasOverdue ? 'warning' : 'arrow-forward'} size={16} color={hasOverdue ? '#F44336' : '#FF9800'} />
                                    <Text ml="l8" fontSize={measure.m13} color="colorTextSecondary">
                                        A devolver à empresa
                                    </Text>
                                </Box>
                                <Text
                                    testID="adiantamentos-a-devolver"
                                    fontSize={measure.m14}
                                    fontWeightPreset="semibold"
                                    color={hasOverdue ? 'colorTextError' : 'colorTextWarning'}
                                >
                                    {formatCurrency(advances.totalPending)}
                                </Text>
                            </Box>
                            <Text fontSize={measure.m11} color="colorTextSecondary" mt="t4">
                                Adiantamentos e dinheiro recebido de clientes. A devolução é registrada pela empresa e não sai do seu saldo.
                            </Text>
                            {hasOverdue && (
                                <Text mt="t8" fontSize={measure.m11} color="colorTextError">
                                    {`${advances.overdueCount} vencido(s). Regularize com a empresa.`}
                                </Text>
                            )}
                        </TouchableOpacityBox>
                    ) : null}

                    {/* Ações rápidas */}
                    <Box mt="t24">
                        <Text fontSize={measure.m16} fontWeightPreset="bold" mb="b12">
                            Ações rápidas
                        </Text>
                        <Box flexDirection="row" gap="x12" mb="b12">
                            <QuickAction icon="cash-outline" color="#4CAF50" label="Sacar" onPress={() => router.push('/menu/carteira/saque')} />
                            <QuickAction icon="list-outline" color="#2196F3" label="Extrato" onPress={() => router.push('/menu/carteira/extrato')} />
                        </Box>
                        <Box flexDirection="row" gap="x12" mb="b12">
                            <QuickAction icon="receipt-outline" color="#607D8B" label="Meus saques" onPress={() => router.push('/menu/carteira/saques')} />
                            <QuickAction
                                icon="arrow-forward-outline"
                                color="#FF9800"
                                label="Adiantamentos"
                                onPress={() => router.push('/menu/carteira/adiantamentos')}
                            />
                        </Box>
                        <Box flexDirection="row" gap="x12">
                            <QuickAction icon="trending-up-outline" color="#9C27B0" label="Ganhos" onPress={() => router.push('/menu/ganhos')} />
                            <QuickAction
                                icon="wallet-outline"
                                color="#795548"
                                label="Cobranças"
                                onPress={() => router.push('/menu/ganhos/cobrancas')}
                            />
                        </Box>
                    </Box>

                    {/* Dados bancários */}
                    <Box mt="t24">
                        <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="b12">
                            <Text fontSize={measure.m16} fontWeightPreset="bold">
                                Dados bancários
                            </Text>
                            {wallet.hasBankInfo && (
                                <TouchableOpacityBox onPress={() => router.push('/menu/carteira/config/dados-bancarios')}>
                                    <Text fontSize={measure.m14} color="colorTextPrimary">
                                        Editar
                                    </Text>
                                </TouchableOpacityBox>
                            )}
                        </Box>

                        <Box p="m16" borderRadius="s12">
                            {wallet.hasBankInfo ? (
                                <>
                                    {!!wallet.pixKey && (
                                        <Box>
                                            <Text fontSize={measure.m12} color="colorTextSecondary">
                                                Chave PIX
                                            </Text>
                                            <Text fontSize={measure.m14} fontWeightPreset="semibold" mt="t4">
                                                {wallet.pixKey}
                                            </Text>
                                        </Box>
                                    )}
                                    {!!wallet.bankName && (
                                        <Box mt={wallet.pixKey ? 't12' : 't0'}>
                                            <Text fontSize={measure.m12} color="colorTextSecondary">
                                                Banco
                                            </Text>
                                            <Text fontSize={measure.m14} fontWeightPreset="semibold" mt="t4">
                                                {wallet.bankName}
                                            </Text>
                                            {!!wallet.bankAgency && !!wallet.bankAccount && (
                                                <Text fontSize={measure.m14} color="colorTextSecondary" mt="t4">
                                                    {`Ag: ${wallet.bankAgency} | Conta: ${wallet.bankAccount}`}
                                                </Text>
                                            )}
                                        </Box>
                                    )}
                                </>
                            ) : (
                                <Box alignItems="center" py="y8">
                                    <Ionicons name="alert-circle-outline" size={measure.m24} color="#FF9800" />
                                    <Text mt="t8" color="colorTextSecondary" textAlign="center">
                                        Configure seus dados bancários para realizar saques
                                    </Text>
                                    <TouchableOpacityBox
                                        mt="t12"
                                        px="x16"
                                        py="y8"
                                        borderRadius="s8"
                                        onPress={() => router.push('/menu/carteira/config/dados-bancarios')}
                                    >
                                        <Text fontSize={measure.m14} fontWeightPreset="semibold">
                                            Configurar
                                        </Text>
                                    </TouchableOpacityBox>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            </ScrollView>
        </ScreenBase>
    );
}
