// src/app/(auth)/(tabs)/menu/carteira/index.tsx

import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Box, Text, ScreenBase, TouchableOpacityBox, ActivityIndicator } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { useWalletBreakdown } from '@/domain/agility/wallet';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

export default function CarteiraScreen() {
    const router = useRouter();
    const { wallet, breakdown, isLoading, isError, refetch, isRefetching } = useWalletBreakdown();

    const formatBalance = (value: number) => formatCurrency(value);

    if (isLoading) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset='textTitleScreen'>Carteira</Text>}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    if (isError || !wallet) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset='textTitleScreen'>Carteira</Text>}>
                <ButtonBack />
                <Box flex={1} justifyContent="center" alignItems="center" px="x24">
                    <Ionicons name="wallet-outline" size={64} color="#999" />
                    <Text mt="t16" textAlign="center" color="colorTextSecondary">
                        Não foi possível carregar sua carteira.
                    </Text>
                    <TouchableOpacityBox mt="t16" onPress={() => refetch()}>
                        <Text color="colorTextPrimary">Tentar novamente</Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset='textTitleScreen'>Carteira</Text>}>
            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
            >
                <Box>

                    {/* Balance Card */}
                    <Box
                        p="m20"
                        borderRadius="s16"
                    >
                        <Text fontSize={measure.m14} color="colorTextSecondary">
                            Saldo disponível
                        </Text>
                        <Text fontSize={32} fontWeight="bold" mt="t8" color="colorTextPrimary">
                            {formatBalance(wallet.availableBalance)}
                        </Text>

                        <Box flexDirection="row" mt="t16" gap="x24">
                            <Box flex={1} alignItems="flex-start">
                                <Text fontSize={measure.m12} color="colorTextSecondary">
                                    Saldo total
                                </Text>
                                <Text fontSize={measure.m16} fontWeightPreset='bold' mt="t4" color="colorTextPrimary">
                                    {formatBalance(wallet.balance)}
                                </Text>
                            </Box>
                            <Box flex={1} alignItems="flex-end">
                                <Text fontSize={measure.m12} color="colorTextSecondary">
                                    Bloqueado
                                </Text>
                                <Text fontSize={measure.m16} fontWeightPreset='bold' mt="t4" color="colorTextWarning">
                                    {formatBalance(wallet.blockedBalance)}
                                </Text>
                            </Box>
                        </Box>
                    </Box>

                    {/* Balance Breakdown - Composição do Saldo */}
                    {breakdown && (breakdown.advanceObligations > 0 || breakdown.hasOverdueAdvances) && (
                        <Box mt="t16" mx="m16" p="m16" borderRadius="s12" backgroundColor="gray50">
                            <Text fontSize={measure.m14} fontWeightPreset='bold' mb="b12">
                                Composição do Saldo
                            </Text>

                            {/* Ganhos de Uberização */}
                            <Box flexDirection="row" justifyContent="space-between" alignItems="center" py="y8">
                                <Box flexDirection="row" alignItems="center">
                                    <Ionicons name="car" size={16} color="#9C27B0" />
                                    <Text ml="l8" fontSize={measure.m13} color="colorTextSecondary">
                                        Ganhos próprios
                                    </Text>
                                </Box>
                                <Text fontSize={measure.m14} fontWeightPreset='semibold' color="colorTextSuccess">
                                    +{formatBalance(breakdown.uberizationBalance)}
                                </Text>
                            </Box>

                            {/* Adiantamentos a Devolver */}
                            <Box flexDirection="row" justifyContent="space-between" alignItems="center" py="y8" borderTopWidth={1} borderTopColor="borderColor">
                                <Box flexDirection="row" alignItems="center">
                                    <Ionicons
                                        name={breakdown.hasOverdueAdvances ? "warning" : "arrow-forward"}
                                        size={16}
                                        color={breakdown.hasOverdueAdvances ? "#F44336" : "#FF9800"}
                                    />
                                    <Text ml="l8" fontSize={measure.m13} color="colorTextSecondary">
                                        Adiantamentos a devolver
                                    </Text>
                                </Box>
                                <Text fontSize={measure.m14} fontWeightPreset='semibold' color={breakdown.hasOverdueAdvances ? "colorTextError" : "colorTextWarning"}>
                                    -{formatBalance(breakdown.advanceObligations)}
                                </Text>
                            </Box>

                            {/* Linha divisória */}
                            <Box height={2} backgroundColor="borderColor" my="m8" />

                            {/* Saldo Real */}
                            <Box flexDirection="row" justifyContent="space-between" alignItems="center" py="y4">
                                <Text fontSize={measure.m14} fontWeightPreset='bold' color="colorTextPrimary">
                                    Saldo disponível real
                                </Text>
                                <Text fontSize={measure.m16} fontWeightPreset='bold' color="primary100">
                                    {formatBalance(breakdown.netAvailableBalance)}
                                </Text>
                            </Box>

                            {/* Alerta de adiantamentos vencidos */}
                            {breakdown.hasOverdueAdvances && (
                                <Box flexDirection="row" alignItems="center" mt="t8" p="m8" borderRadius="s8" backgroundColor="redError">
                                    <Ionicons name="alert-circle" size={14} color="#F44336" />
                                    <Text ml="l6" fontSize={measure.m11} color="colorTextError">
                                        Você tem adiantamentos vencidos. Regularize para evitar bloqueios.
                                    </Text>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Quick Actions */}
                    <Box mt="t24">
                        <Text fontSize={measure.m16} fontWeightPreset='bold' mb="b12">
                            Ações rápidas
                        </Text>

                        {/* Primeira linha: Sacar e Extrato */}
                        <Box flexDirection="row" gap="x12" mb="b12">
                            <TouchableOpacityBox
                                flex={1}
                                p="m16"
                                borderRadius="s12"
                                alignItems="center"
                                onPress={() => router.push('/menu/carteira/saque')}
                            >
                                <Ionicons name="cash-outline" size={measure.m24} color="#4CAF50" />
                                <Text mt="t8" fontSize={measure.m14} fontWeightPreset='semibold' textAlign="center">
                                    Sacar
                                </Text>
                            </TouchableOpacityBox>

                            <TouchableOpacityBox
                                flex={1}
                                p="m16"
                                borderRadius="s12"
                                alignItems="center"
                                onPress={() => router.push('/menu/carteira/extrato')}
                            >
                                <Ionicons name="list-outline" size={measure.m24} color="#2196F3" />
                                <Text mt="t8" fontSize={measure.m14} fontWeightPreset='semibold' textAlign="center">
                                    Extrato
                                </Text>
                            </TouchableOpacityBox>
                        </Box>

                        {/* Segunda linha: Adiantamentos e Ganhos */}
                        <Box flexDirection="row" gap="x12">
                            <TouchableOpacityBox
                                flex={1}
                                p="m16"
                                borderRadius="s12"
                                alignItems="center"
                                onPress={() => router.push('/menu/carteira/adiantamentos')}
                            >
                                <Ionicons name="arrow-forward-outline" size={measure.m24} color="#FF9800" />
                                <Text mt="t8" fontSize={measure.m14} fontWeightPreset='semibold' textAlign="center">
                                    Adiantamentos
                                </Text>
                            </TouchableOpacityBox>

                            <TouchableOpacityBox
                                flex={1}
                                p="m16"
                                borderRadius="s12"
                                alignItems="center"
                                onPress={() => router.push('/menu/ganhos')}
                            >
                                <Ionicons name="trending-up-outline" size={measure.m24} color="#9C27B0" />
                                <Text mt="t8" fontSize={measure.m14} fontWeightPreset='semibold' textAlign="center">
                                    Ganhos
                                </Text>
                            </TouchableOpacityBox>
                        </Box>
                    </Box>

                    {/* Bank Info */}
                    <Box mt="t24">
                        <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="b12">
                            <Text fontSize={measure.m16} fontWeightPreset='bold'>
                                Dados bancários
                            </Text>
                            <TouchableOpacityBox onPress={() => router.push('/menu/carteira/config/dados-bancarios')}>
                                <Text fontSize={measure.m14} color="colorTextPrimary">Editar</Text>
                            </TouchableOpacityBox>
                        </Box>

                        <Box p="m16" borderRadius="s12">
                            {wallet.hasBankInfo ? (
                                <>
                                    {wallet.pixKey && (
                                        <Box>
                                            <Text fontSize={measure.m12} color="colorTextSecondary">Chave PIX</Text>
                                            <Text fontSize={measure.m14} fontWeightPreset='semibold' mt="t4">{wallet.pixKey}</Text>
                                        </Box>
                                    )}
                                    {wallet.bankName && (
                                        <Box mt={wallet.pixKey ? 't12' : 't0'}>
                                            <Text fontSize={measure.m12} color="colorTextSecondary">Banco</Text>
                                            <Text fontSize={measure.m14} fontWeightPreset='semibold' mt="t4">{wallet.bankName}</Text>
                                            {wallet.bankAgency && wallet.bankAccount && (
                                                <Text fontSize={measure.m14} color="colorTextSecondary" mt="t4">
                                                    Ag: {wallet.bankAgency} | Conta: {wallet.bankAccount}
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
                                        <Text fontSize={measure.m14} fontWeightPreset='semibold'>Configurar</Text>
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
