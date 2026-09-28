// src/app/(auth)/(tabs)/menu/carteira/saque.tsx

import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { mensagemDaApi } from '@/api/apiErrorMessage';
import { ActivityIndicator, Box, BRLInput, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import Modal from '@/components/Modal/Modal';
import { useGetWallet, useRequestWithdrawal } from '@/domain/agility/wallet';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

const MIN_WITHDRAWAL_CENTS = 100; // R$ 1,00, o mesmo @Min(100) do CreateWithdrawalDto

export default function SaqueScreen() {
    const router = useRouter();
    const { showToast } = useToastService();
    const [amountCents, setAmountCents] = useState<number | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const { wallet, isLoading: isLoadingWallet, isError: isWalletError, refetch: refetchWallet } = useGetWallet();
    const { requestWithdrawal } = useRequestWithdrawal();
    const { run, isSubmitting, isLocked } = useSubmitLock();

    const availableBalance = wallet?.availableBalance ?? 0;
    const value = amountCents ?? 0;

    function goToBankInfo() {
        router.push('/menu/carteira/config/dados-bancarios');
    }

    function handleRequestSaque() {
        // Com um pedido em voo, reabrir o modal permitiria um segundo POST.
        if (isLocked()) return;
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
        setShowConfirmModal(false);
        await run(async () => {
            try {
                await requestWithdrawal({ amount: value });
                showToast({ message: 'Saque solicitado. Acompanhe em Meus saques.', type: 'success' });
                // `replace`: voltar não reabre o formulário preenchido (R10).
                router.replace('/menu/carteira/saques');
            } catch (error) {
                // O valor digitado fica: o motorista corrige ou tenta de novo.
                showToast({ message: mensagemDaApi(error, 'Não foi possível solicitar o saque. Tente novamente.'), type: 'error' });
            }
        });
    }

    if (isLoadingWallet) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Saque</Text>}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    // GET /wallet falhou e não há nada em cache: mostrar R$ 0,00 + "Configure seus dados
    // bancários" mentiria — pareceria uma carteira vazia/sem PIX cadastrado, quando na
    // verdade nada foi carregado ainda. Erro pede "Tentar novamente", nunca cai no vazio.
    if (isWalletError && !wallet) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Saque</Text>}>
                <Box flex={1} justifyContent="center" alignItems="center" p="m24">
                    <Ionicons name="alert-circle" size={40} color="#F44336" />
                    <Text mt="t16" color="colorTextSecondary" textAlign="center">
                        Não foi possível carregar sua carteira.
                    </Text>
                    <TouchableOpacityBox
                        testID="saque-carteira-erro"
                        accessibilityRole="button"
                        mt="t16"
                        p="m12"
                        onPress={() => refetchWallet()}
                    >
                        <Text color="colorTextPrimary" fontWeightPreset="semibold">
                            Tentar novamente
                        </Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    const invalid = value < MIN_WITHDRAWAL_CENTS || value > availableBalance || !wallet?.hasBankInfo;
    const disabledReason = !wallet?.hasBankInfo
        ? 'Configure seus dados bancários para sacar'
        : value < MIN_WITHDRAWAL_CENTS
            ? `Valor mínimo: ${formatCurrency(MIN_WITHDRAWAL_CENTS)}`
            : value > availableBalance
                ? 'Valor maior que o saldo disponível'
                : null;

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen">Saque</Text>}>
            <ScrollView>
                <Box pt="t16">
                    <Box mt="t24" p="m20" borderRadius="s16" alignItems="center">
                        <Text fontSize={measure.m14} color="colorTextSecondary">
                            Disponível para saque
                        </Text>
                        <Text fontSize={28} fontWeight="bold" mt="t8" color="colorTextSuccess">
                            {formatCurrency(availableBalance)}
                        </Text>
                    </Box>

                    <Box mt="t24">
                        <Text fontSize={measure.m14} fontWeightPreset="semibold" mb="b8">
                            Valor do saque
                        </Text>
                        <BRLInput valueCents={amountCents} onChangeCents={setAmountCents} maxCents={availableBalance} placeholder="R$ 0,00" />

                        <TouchableOpacityBox
                            mt="t8"
                            onPress={() => setAmountCents(availableBalance)}
                            disabled={availableBalance < MIN_WITHDRAWAL_CENTS || isSubmitting}
                        >
                            <Text fontSize={measure.m12} color="colorTextPrimary">
                                {`Sacar tudo (${formatCurrency(availableBalance)})`}
                            </Text>
                        </TouchableOpacityBox>
                    </Box>

                    {value > 0 && (
                        <Box mt="t24" p="m16" borderRadius="s12">
                            <Box flexDirection="row" justifyContent="space-between">
                                <Text color="colorTextSecondary">Valor solicitado</Text>
                                <Text fontWeightPreset="semibold">{formatCurrency(value)}</Text>
                            </Box>
                            <Box flexDirection="row" justifyContent="space-between" mt="t12" pt="t12" borderTopWidth={1}>
                                <Text fontWeightPreset="bold">Você recebe</Text>
                                <Text fontWeightPreset="bold" color="colorTextSuccess">
                                    {formatCurrency(value)}
                                </Text>
                            </Box>
                        </Box>
                    )}

                    <TouchableOpacityBox mt="t24" onPress={goToBankInfo} flexDirection="row" alignItems="center">
                        <Ionicons
                            name={wallet?.hasBankInfo ? 'checkmark-circle' : 'alert-circle'}
                            size={measure.m20}
                            color={wallet?.hasBankInfo ? '#4CAF50' : '#FF9800'}
                        />
                        <Text ml="l8" color="colorTextSecondary" flex={1}>
                            {wallet?.hasBankInfo ? 'Dados bancários configurados' : 'Configure seus dados bancários (toque para abrir)'}
                        </Text>
                        <Ionicons name="chevron-forward" size={measure.m16} color="#9CA3AF" />
                    </TouchableOpacityBox>

                    <Box mt="t32" mb="b8">
                        <Button title="Solicitar Saque" onPress={handleRequestSaque} isLoading={isSubmitting} disabled={invalid || isSubmitting} />
                    </Box>

                    {disabledReason && (
                        <Text fontSize={measure.m12} color="colorTextSecondary" textAlign="center" mb="b16">
                            {disabledReason}
                        </Text>
                    )}

                    <Box p="m16" borderRadius="s12" mt="t16">
                        <Text fontSize={measure.m12} color="colorTextSecondary" textAlign="center">
                            O saque é pago pela empresa, normalmente em até 24 horas úteis. Até lá, o valor sai do disponível e fica em
                            &quot;Saque pendente&quot;.
                        </Text>
                    </Box>
                </Box>
            </ScrollView>

            <Modal
                preset="action"
                isVisible={showConfirmModal && !isSubmitting}
                title="Confirmar saque"
                text={`Deseja solicitar o saque de ${formatCurrency(value)}?\n\nO valor sai do disponível e fica em "Saque pendente" até o pagamento.`}
                buttonActionTitle="Confirmar"
                buttonCloseTitle="Cancelar"
                onPress={handleConfirmSaque}
                onClose={() => setShowConfirmModal(false)}
            />
        </ScreenBase>
    );
}
