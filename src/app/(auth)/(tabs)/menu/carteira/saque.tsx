// src/app/(auth)/(tabs)/menu/carteira/saque.tsx

import React, { useRef, useState } from 'react';
import { ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Box, Text, ScreenBase, TouchableOpacityBox, ActivityIndicator, BRLInput, Button } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import Modal from '@/components/Modal/Modal';
import { useGetWallet, useRequestWithdrawal } from '@/domain/agility/wallet';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

const MIN_WITHDRAWAL_CENTS = 100; // R$ 1,00

export default function SaqueScreen() {
    const router = useRouter();
    const { showToast } = useToastService();
    const [amountCents, setAmountCents] = useState<number | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const { wallet, isLoading: isLoadingWallet, refetch } = useGetWallet();
    const { requestWithdrawal, isPending } = useRequestWithdrawal();
    // Guard síncrono contra duplo-tap no botão "Confirmar" do modal.
    // O `isPending` da mutation só vira true depois que a request inicia,
    // deixando uma janela onde uma segunda chamada passa sem bloqueio.
    const isSubmittingRef = useRef(false);

    const availableBalance = wallet?.availableBalance ?? 0;
    const value = amountCents ?? 0;

    function goToBankInfo() {
        router.push('/menu/carteira/config/dados-bancarios');
    }

    function handleRequestSaque() {
        if (value < MIN_WITHDRAWAL_CENTS) {
            showToast({ message: 'O valor mínimo para saque é R$ 1,00', type: 'error' });
            return;
        }
        if (value > availableBalance) {
            showToast({ message: 'Saldo insuficiente para este saque', type: 'error' });
            return;
        }
        if (!wallet?.hasBankInfo) {
            showToast({
                message: 'Configure seus dados bancários antes de sacar',
                type: 'error',
                action: { title: 'Configurar', onPress: goToBankInfo },
            });
            return;
        }
        setShowConfirmModal(true);
    }

    async function handleConfirmSaque() {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setShowConfirmModal(false);
        try {
            await requestWithdrawal({ amount: value });
            showToast({ message: 'Solicitação de saque realizada com sucesso!', type: 'success' });
            setAmountCents(null);
            refetch();
        } catch (error) {
            showToast({ message: 'Não foi possível processar sua solicitação.', type: 'error' });
        } finally {
            isSubmittingRef.current = false;
        }
    }

    if (isLoadingWallet) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset='textTitleScreen'>Saque</Text>}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    const buttonDisabled = value < MIN_WITHDRAWAL_CENTS || value > availableBalance || !wallet?.hasBankInfo;
    const disabledReason = !wallet?.hasBankInfo
        ? 'Configure seus dados bancários para sacar'
        : value < MIN_WITHDRAWAL_CENTS
            ? `Valor mínimo: ${formatCurrency(MIN_WITHDRAWAL_CENTS)}`
            : value > availableBalance
                ? 'Valor maior que o saldo disponível'
                : null;

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset='textTitleScreen'>Saque</Text>}>
            <ScrollView>
                <Box pt="t16">
                    {/* Available Balance */}
                    <Box mt="t24" p="m20" borderRadius="s16" alignItems="center">
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
                        <BRLInput
                            valueCents={amountCents}
                            onChangeCents={setAmountCents}
                            maxCents={availableBalance}
                            placeholder="R$ 0,00"
                        />

                        <TouchableOpacityBox
                            mt="t8"
                            onPress={() => setAmountCents(availableBalance)}
                            disabled={availableBalance < MIN_WITHDRAWAL_CENTS}
                        >
                            <Text fontSize={measure.m12} color="colorTextPrimary">
                                Sacar tudo ({formatCurrency(availableBalance)})
                            </Text>
                        </TouchableOpacityBox>
                    </Box>

                    {/* Preview */}
                    {value > 0 && (
                        <Box mt="t24" p="m16" borderRadius="s12">
                            <Box flexDirection="row" justifyContent="space-between">
                                <Text color="colorTextSecondary">Valor solicitado</Text>
                                <Text fontWeightPreset='semibold'>{formatCurrency(value)}</Text>
                            </Box>
                            <Box flexDirection="row" justifyContent="space-between" mt="t8">
                                <Text color="colorTextSecondary">Taxa</Text>
                                <Text fontWeightPreset='semibold'>{formatCurrency(0)}</Text>
                            </Box>
                            <Box flexDirection="row" justifyContent="space-between" mt="t12" pt="t12" borderTopWidth={1}>
                                <Text fontWeightPreset='bold'>Você recebe</Text>
                                <Text fontWeightPreset='bold' color="colorTextSuccess">
                                    {formatCurrency(value)}
                                </Text>
                            </Box>
                        </Box>
                    )}

                    {/* Bank Info Status — clickable */}
                    <TouchableOpacityBox
                        mt="t24"
                        onPress={goToBankInfo}
                        flexDirection="row"
                        alignItems="center"
                    >
                        <Ionicons
                            name={wallet?.hasBankInfo ? 'checkmark-circle' : 'alert-circle'}
                            size={measure.m20}
                            color={wallet?.hasBankInfo ? '#4CAF50' : '#FF9800'}
                        />
                        <Text ml="l8" color="colorTextSecondary" flex={1}>
                            {wallet?.hasBankInfo
                                ? 'Dados bancários configurados'
                                : 'Configure seus dados bancários (toque para abrir)'}
                        </Text>
                        <Ionicons name="chevron-forward" size={measure.m16} color="#9CA3AF" />
                    </TouchableOpacityBox>

                    {/* Submit Button */}
                    <Box mt="t32" mb="b8">
                        <Button
                            title="Solicitar Saque"
                            onPress={handleRequestSaque}
                            isLoading={isPending}
                            disabled={buttonDisabled}
                        />
                    </Box>

                    {disabledReason && (
                        <Text fontSize={measure.m12} color="colorTextSecondary" textAlign="center" mb="b16">
                            {disabledReason}
                        </Text>
                    )}

                    {/* Info */}
                    <Box p="m16" borderRadius="s12" mt="t16">
                        <Text fontSize={measure.m12} color="colorTextSecondary" textAlign="center">
                            O saque será processado em até 24 horas úteis.
                            O valor ficará bloqueado até a confirmação do pagamento.
                        </Text>
                    </Box>
                </Box>
            </ScrollView>

            {/* Confirmation Modal */}
            <Modal
                preset="action"
                isVisible={showConfirmModal}
                title="Confirmar saque"
                text={`Deseja solicitar o saque de ${formatCurrency(value)}?\n\nApós confirmar, o valor ficará bloqueado até o processamento.`}
                buttonActionTitle="Confirmar"
                buttonCloseTitle="Cancelar"
                onPress={handleConfirmSaque}
                onClose={() => setShowConfirmModal(false)}
            />
        </ScreenBase>
    );
}
