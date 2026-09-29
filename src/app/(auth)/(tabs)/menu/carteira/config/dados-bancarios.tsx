// src/app/(auth)/(tabs)/menu/carteira/config/dados-bancarios.tsx

import React, { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { mensagemDaApi } from '@/api/apiErrorMessage';
import { ActivityIndicator, Box, Button, Input, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { useGetWallet, useUpdateBankInfo } from '@/domain/agility/wallet';
import type { WalletResponse } from '@/domain/agility/wallet/dto';
import { PixKeyType } from '@/domain/agility/wallet/dto/types';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { PIX_KEY_HINTS, validatePixKey } from '@/utils/validatePix';

import { BankInfoForm, buildBankInfoPayload, formFromWallet, validateBankForm } from '../_utils/bankInfoForm';

const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
    [PixKeyType.CPF]: 'CPF',
    [PixKeyType.CNPJ]: 'CNPJ',
    [PixKeyType.EMAIL]: 'E-mail',
    [PixKeyType.PHONE]: 'Telefone',
    [PixKeyType.RANDOM]: 'Chave aleatória',
};

const title = <Text preset="textTitleScreen">Dados bancários</Text>;

export default function DadosBancariosScreen() {
    const { wallet, isLoading, isError, refetch } = useGetWallet();

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
                    <Text textAlign="center" color="colorTextSecondary">
                        Não foi possível carregar seus dados bancários.
                    </Text>
                    <TouchableOpacityBox mt="t16" onPress={() => void refetch()}>
                        <Text color="colorTextPrimary">Tentar novamente</Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    // O formulário só monta com a carteira em mãos: nasce com o que o back tem, mesmo
    // com o cache frio (auditoria, Bug 13.4).
    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={title}>
            <BankInfoFormView wallet={wallet} />
        </ScreenBase>
    );
}

function BankInfoFormView({ wallet }: { wallet: WalletResponse }) {
    const router = useRouter();
    const { showToast } = useToastService();
    const { updateBankInfo } = useUpdateBankInfo();
    const { run, isSubmitting, isLocked } = useSubmitLock();
    const [form, setForm] = useState<BankInfoForm>(() => formFromWallet(wallet));
    const [touched, setTouched] = useState(false);

    function update(patch: Partial<BankInfoForm>) {
        setForm((current) => ({ ...current, ...patch }));
        setTouched(true);
    }

    const pixError = useMemo(
        () => (touched && form.pixKey.trim() !== '' ? validatePixKey(form.pixKey, form.pixKeyType) : null),
        [form.pixKey, form.pixKeyType, touched],
    );

    async function handleSave() {
        if (isLocked()) return;
        setTouched(true);
        const error = validateBankForm(form);
        if (error) {
            showToast({ message: error, type: 'error' });
            return;
        }
        await run(async () => {
            try {
                await updateBankInfo(buildBankInfoPayload(form));
                showToast({ message: 'Dados bancários salvos.', type: 'success' });
                router.back();
            } catch (e) {
                showToast({ message: mensagemDaApi(e, 'Não foi possível salvar os dados bancários.'), type: 'error' });
            }
        });
    }

    const placeholder = form.pixKeyType ? PIX_KEY_HINTS[form.pixKeyType] : 'Informe sua chave PIX';

    return (
        <ScrollView>
            <Box pt="t16">
                <Box mt="t8" p="m16" borderRadius="s12" flexDirection="row">
                    <Ionicons name="information-circle-outline" size={measure.m20} color="#2196F3" />
                    <Text ml="l8" fontSize={measure.m12} color="colorTextSecondary" flex={1}>
                        Cadastre uma chave PIX, uma conta bancária ou as duas. Com chave PIX, o saque sai por PIX; sem ela, por TED.
                    </Text>
                </Box>

                <Box mt="t24">
                    <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="b12">
                        <Text fontSize={measure.m16} fontWeightPreset="bold">
                            Chave PIX
                        </Text>
                        {form.pixKey.trim() !== '' && (
                            <TouchableOpacityBox testID="remover-pix" onPress={() => update({ pixKey: '', pixKeyType: null })}>
                                <Text fontSize={measure.m12} color="colorTextError">
                                    Remover chave PIX
                                </Text>
                            </TouchableOpacityBox>
                        )}
                    </Box>

                    <Text fontSize={measure.m14} color="colorTextSecondary" mb="b8">
                        Tipo de chave
                    </Text>
                    <Box flexDirection="row" flexWrap="wrap" gap="x8" mb="b12">
                        {Object.entries(PIX_KEY_TYPE_LABELS).map(([type, label]) => (
                            <TouchableOpacityBox
                                key={type}
                                px="x12"
                                py="y8"
                                borderRadius="s8"
                                borderWidth={1}
                                borderColor={form.pixKeyType === type ? 'primary100' : 'background'}
                                bg={form.pixKeyType === type ? 'primary10' : 'background'}
                                onPress={() => update({ pixKeyType: type as PixKeyType })}
                            >
                                <Text fontSize={measure.m12} fontWeightPreset="semibold" color={form.pixKeyType === type ? 'primary100' : 'colorTextPrimary'}>
                                    {label}
                                </Text>
                            </TouchableOpacityBox>
                        ))}
                    </Box>

                    <Input placeholder={placeholder} value={form.pixKey} onChangeText={(t) => update({ pixKey: t })} messageError={pixError ?? undefined} />
                    {!pixError && form.pixKeyType && (
                        <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                            {`Formato esperado: ${PIX_KEY_HINTS[form.pixKeyType]}`}
                        </Text>
                    )}
                </Box>

                <Box mt="t32">
                    <Text fontSize={measure.m16} fontWeightPreset="bold" mb="b12">
                        Conta bancária
                    </Text>
                    <Text fontSize={measure.m12} color="colorTextSecondary" mb="b12">
                        Preencha os três campos, ou deixe os três em branco.
                    </Text>

                    <Box mb="b12">
                        <Text fontSize={measure.m14} color="colorTextSecondary" mb="b4">
                            Banco
                        </Text>
                        <Input placeholder="Nome do banco" value={form.bankName} onChangeText={(t) => update({ bankName: t })} />
                    </Box>

                    <Box flexDirection="row" gap="x12">
                        <Box flex={1}>
                            <Text fontSize={measure.m14} color="colorTextSecondary" mb="b4">
                                Agência
                            </Text>
                            <Input
                                placeholder="0000"
                                value={form.bankAgency}
                                onChangeText={(t) => update({ bankAgency: t })}
                                keyboardType="numeric"
                                width={measure.x150}
                            />
                        </Box>
                        <Box flex={1}>
                            <Text fontSize={measure.m14} color="colorTextSecondary" mb="b4">
                                Conta
                            </Text>
                            <Input
                                placeholder="00000-0"
                                value={form.bankAccount}
                                onChangeText={(t) => update({ bankAccount: t })}
                                keyboardType="numeric"
                                width={measure.x160}
                            />
                        </Box>
                    </Box>
                </Box>

                <Box mt="t32" mb="b32">
                    <Button title="Salvar dados" onPress={handleSave} isLoading={isSubmitting} disabled={isSubmitting} />
                </Box>
            </Box>
        </ScrollView>
    );
}
