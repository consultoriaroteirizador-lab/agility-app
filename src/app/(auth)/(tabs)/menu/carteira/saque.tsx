// src/app/(auth)/(tabs)/menu/carteira/saque.tsx

import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, BRLInput, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import Modal from '@/components/Modal/Modal';
import { useGetAdvancesSummary, useGetWallet, useRequestWithdrawal, useWithdrawalAllowance } from '@/domain/agility/wallet';
import { withdrawCapCents } from '@/domain/agility/wallet/withdrawalAllowance';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { PolicyNoticeBox } from './_components/PolicyNoticeBox';
import { isWithdrawalKeyReused, maxWithdrawalFromError, withdrawalErrorMessage, withdrawalPolicyNotice } from './_utils/debtPolicy';
import { pixKeyChangeNotice } from './_utils/pixKeyNotice';
import { walletDestination } from './_utils/withdrawalDisplay';
import { withdrawalSubmitToast } from './_utils/withdrawalSubmit';

const MIN_WITHDRAWAL_CENTS = 100; // R$ 1,00, o mesmo @Min(100) do CreateWithdrawalDto

export default function SaqueScreen() {
    const router = useRouter();
    const { showToast } = useToastService();
    const [amountCents, setAmountCents] = useState<number | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const { wallet, isLoading: isLoadingWallet, isError: isWalletError, refetch: refetchWallet } = useGetWallet();
    const { allowance } = useWithdrawalAllowance();
    const { summary: debts } = useGetAdvancesSummary();
    const { requestWithdrawal } = useRequestWithdrawal();
    const { run, isSubmitting, isLocked } = useSubmitLock();
    // Uma chave por abertura da tela (R1 da F5c): toda tentativa daqui reenvia a mesma, inclusive
    // com outro valor. Abrir "Dados bancários" por cima não desmonta a tela; o sucesso a substitui.
    const [idempotencyKey] = useState(() => Crypto.randomUUID());

    const availableBalance = wallet?.availableBalance ?? 0;
    // Teto = menor entre o disponível e o que a política de dívida deixa (F3). Sem o resumo
    // (carregando, erro, back sem F3), o teto é o disponível e o back decide (R3).
    const cap = withdrawCapCents(availableBalance, allowance);
    // Só há "regra de dívidas" quando há política que limita: sem ela (allowance null) o teto é o
    // disponível, e com FREE um teto menor é só o resumo de outro momento que o /wallet.
    const limitedByDebt = allowance !== null && allowance.policy !== 'FREE' && cap < withdrawCapCents(availableBalance, null);
    const value = amountCents ?? 0;
    const policyNotice = withdrawalPolicyNotice(allowance, debts?.overdueCount ?? null);
    const pixNotice = pixKeyChangeNotice(wallet);

    function goToBankInfo() {
        router.push('/menu/carteira/config/dados-bancarios');
    }

    function goToDebts() {
        router.push('/menu/carteira/adiantamentos');
    }

    function handleRequestSaque() {
        // Com um pedido em voo, reabrir o modal permitiria um segundo POST.
        if (isLocked()) return;
        if (value < MIN_WITHDRAWAL_CENTS) {
            showToast({ message: 'O valor mínimo para saque é R$ 1,00', type: 'error' });
            return;
        }
        if (value > cap) {
            showToast({
                message: limitedByDebt
                    ? `Pela regra de dívidas da empresa, o máximo agora é ${formatCurrency(cap)}`
                    : 'Saldo insuficiente para este saque',
                type: 'error',
            });
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
        // O teto pode ter baixado (refetch) com o modal aberto: revalida antes de mandar o POST.
        if (value > cap) {
            showToast({
                message: limitedByDebt
                    ? `Pela regra de dívidas da empresa, o máximo agora é ${formatCurrency(cap)}`
                    : 'Saldo insuficiente para este saque',
                type: 'error',
            });
            return;
        }
        await run(async () => {
            try {
                const saque = await requestWithdrawal({ amount: value, idempotencyKey });
                // Repetição com a mesma chave devolve o saque no estado atual (F6): o toast diz qual.
                showToast(withdrawalSubmitToast(saque));
                // `replace`: voltar não reabre o formulário preenchido (R10).
                router.replace('/menu/carteira/saques');
            } catch (error) {
                // O valor digitado fica. A recusa pela política de dívida (F3) traz o máximo: a
                // mensagem diz o número e a ação SÓ preenche o campo — enviar é outro toque.
                const max = maxWithdrawalFromError(error);
                const action = isWithdrawalKeyReused(error)
                    ? { title: 'Meus saques', onPress: () => router.replace('/menu/carteira/saques') }
                    : max !== null
                      ? { title: 'Usar o máximo', onPress: () => setAmountCents(max) }
                      : null;
                showToast({
                    message: withdrawalErrorMessage(error, 'Não foi possível solicitar o saque. Tente novamente.'),
                    type: 'error',
                    ...(action ? { action } : {}),
                });
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

    const invalid = value < MIN_WITHDRAWAL_CENTS || value > cap || !wallet?.hasBankInfo;
    // Com o aviso de bloqueio na tela, "Valor mínimo..." ao lado dele confundiria (P10).
    const disabledReason = policyNotice?.tone === 'block'
        ? null
        : !wallet?.hasBankInfo
            ? 'Configure seus dados bancários para sacar'
            : value < MIN_WITHDRAWAL_CENTS
                ? `Valor mínimo: ${formatCurrency(MIN_WITHDRAWAL_CENTS)}`
                : value > cap
                    ? limitedByDebt
                        ? `Máximo pela regra de dívidas: ${formatCurrency(cap)}`
                        : 'Valor maior que o saldo disponível'
                    : null;

    // Destino e alerta de chave (F3): o motorista confere PARA ONDE vai antes de confirmar (R9).
    // O destino vem do GET /wallet em cache: é a chave (ou a conta, no TED) ATUAL da carteira, e o texto diz isso.
    const confirmText = [
        `Deseja solicitar o saque de ${formatCurrency(value)}?`,
        wallet
            ? `Destino: ${walletDestination(wallet)}\n${wallet.pixKey ? '(a chave atual da sua carteira)' : '(os dados atuais da sua carteira)'}`
            : null,
        pixNotice?.recent ? `Atenção: ${pixNotice.text}` : null,
        'O valor sai do disponível e fica em "Saque pendente" até o pagamento.',
    ]
        .filter(Boolean)
        .join('\n\n');

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

                    {policyNotice && <PolicyNoticeBox notice={policyNotice} onPress={goToDebts} linkText="Ver o que devo à empresa" />}

                    <Box mt="t24">
                        <Text fontSize={measure.m14} fontWeightPreset="semibold" mb="b8">
                            Valor do saque
                        </Text>
                        <BRLInput valueCents={amountCents} onChangeCents={setAmountCents} maxCents={cap} placeholder="R$ 0,00" />

                        <TouchableOpacityBox
                            testID="sacar-tudo"
                            mt="t8"
                            onPress={() => setAmountCents(cap)}
                            disabled={cap < MIN_WITHDRAWAL_CENTS || isSubmitting}
                        >
                            <Text fontSize={measure.m12} color="colorTextPrimary">
                                {`Sacar tudo (${formatCurrency(cap)})`}
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
                text={confirmText}
                buttonActionTitle="Confirmar"
                buttonCloseTitle="Cancelar"
                onPress={handleConfirmSaque}
                onClose={() => setShowConfirmModal(false)}
            />
        </ScreenBase>
    );
}
