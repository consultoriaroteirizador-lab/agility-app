// src/app/(auth)/(tabs)/menu/carteira/saque.tsx

import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Box, Text, ScreenBase, TouchableOpacityBox, ActivityIndicator, Input, Button } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { useGetWallet, useRequestWithdrawal } from '@/domain/agility/wallet';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

export default function SaqueScreen() {
    const [amount, setAmount] = useState('');
    const { wallet, isLoading: isLoadingWallet, refetch } = useGetWallet();
    const { requestWithdrawal, isPending } = useRequestWithdrawal();

    const availableBalance = wallet?.availableBalance ?? 0;
    const amountValue = parseFloat(amount.replace(',', '.')) * 100 || 0;

    const handleSaque = async () => {
        if (amountValue < 100) {
            Alert.alert('Valor inválido', 'O valor mínimo para saque é R$ 1,00');
            return;
        }

        if (amountValue > availableBalance) {
            Alert.alert('Saldo insuficiente', 'Você não tem saldo suficiente para este saque');
            return;
        }

        if (!wallet?.hasBankInfo) {
            Alert.alert(
                'Dados bancários',
                'Você precisa configurar seus dados bancários antes de solicitar um saque.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Configurar', onPress: () => { } }, // Navigate to bank info config
                ]
            );
            return;
        }

        Alert.alert(
            'Confirmar saque',
            `Deseja solicitar o saque de ${formatCurrency(amountValue)}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            await requestWithdrawal({ amount: amountValue });
                            Alert.alert('Sucesso', 'Solicitação de saque realizada com sucesso!');
                            setAmount('');
                            refetch();
                        } catch (error) {
                            Alert.alert('Erro', 'Não foi possível processar sua solicitação.');
                        }
                    },
                },
            ]
        );
    };

    if (isLoadingWallet) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset='textTitleScreen'>Saque</Text>}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset='textTitleScreen'>Saque</Text>}>
            <ScrollView>
                <Box pt="t16">
                    {/* Available Balance */}
                    <Box
                        mt="t24"
                        p="m20"
                        borderRadius="s16"
                        alignItems="center"
                    >
                        <Text fontSize={measure.m14} color="colorTextSecondary">
                            Saldo disponível
                        </Text>
                        <Text fontSize={28} fontWeight="bold" mt="t8" color="colorTextSuccess">
                            {formatCurrency(availableBalance)}
                        </Text>
                    </Box>

                    {/* Amount Input */}
                    <Box mt="t24">
                        <Text fontSize={measure.m14} fontWeightPreset='semibold' mb="b8">
                            Valor do saque
                        </Text>
                        <Input
                            placeholder="0,00"
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                        />

                        <TouchableOpacityBox
                            mt="t8"
                            onPress={() => setAmount((availableBalance / 100).toFixed(2))}
                        >
                            <Text fontSize={measure.m12} color="colorTextPrimary">
                                Sacar tudo
                            </Text>
                        </TouchableOpacityBox>
                    </Box>

                    {/* Preview */}
                    {amountValue > 0 && (
                        <Box mt="t24" p="m16" borderRadius="s12">
                            <Box flexDirection="row" justifyContent="space-between">
                                <Text color="colorTextSecondary">Valor solicitado</Text>
                                <Text fontWeightPreset='semibold'>{formatCurrency(amountValue)}</Text>
                            </Box>
                            <Box flexDirection="row" justifyContent="space-between" mt="t8">
                                <Text color="colorTextSecondary">Taxa</Text>
                                <Text fontWeightPreset='semibold'>{formatCurrency(0)}</Text>
                            </Box>
                            <Box
                                flexDirection="row"
                                justifyContent="space-between"
                                mt="t12"
                                pt="t12"
                                borderTopWidth={1}
                            >
                                <Text fontWeightPreset='bold'>Você recebe</Text>
                                <Text fontWeightPreset='bold' color="colorTextSuccess">
                                    {formatCurrency(amountValue)}
                                </Text>
                            </Box>
                        </Box>
                    )}

                    {/* Bank Info Status */}
                    <Box mt="t24">
                        <Box flexDirection="row" alignItems="center">
                            <Ionicons
                                name={wallet?.hasBankInfo ? 'checkmark-circle' : 'alert-circle'}
                                size={measure.m20}
                                color={wallet?.hasBankInfo ? '#4CAF50' : '#FF9800'}
                            />
                            <Text ml="l8" color="colorTextSecondary">
                                {wallet?.hasBankInfo
                                    ? 'Dados bancários configurados'
                                    : 'Configure seus dados bancários'}
                            </Text>
                        </Box>
                    </Box>

                    {/* Submit Button */}
                    <Box mt="t32" mb="b32">
                        <Button
                            title="Solicitar Saque"
                            onPress={handleSaque}
                            isLoading={isPending}
                            disabled={amountValue < 100 || amountValue > availableBalance || !wallet?.hasBankInfo}
                        />
                    </Box>

                    {/* Info */}
                    <Box p="m16" borderRadius="s12">
                        <Text fontSize={measure.m12} color="colorTextSecondary" textAlign="center">
                            O saque será processado em até 24 horas úteis.
                            O valor ficará bloqueado até a confirmação do pagamento.
                        </Text>
                    </Box>
                </Box>
            </ScrollView>
        </ScreenBase>
    );
}
