// src/app/(auth)/(tabs)/menu/carteira/config/dados-bancarios.tsx

import React, { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Box, Text, ScreenBase, ActivityIndicator, Input, Button, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { useGetWallet, useUpdateBankInfo } from '@/domain/agility/wallet';
import { PixKeyType } from '@/domain/agility/wallet/dto/types';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';
import { PIX_KEY_HINTS, validatePixKey } from '@/utils/validatePix';

const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
    [PixKeyType.CPF]: 'CPF',
    [PixKeyType.CNPJ]: 'CNPJ',
    [PixKeyType.EMAIL]: 'E-mail',
    [PixKeyType.PHONE]: 'Telefone',
    [PixKeyType.RANDOM]: 'Chave aleatória',
};

export default function DadosBancariosScreen() {
    const { wallet, isLoading } = useGetWallet();
    const { updateBankInfo, isPending } = useUpdateBankInfo();
    const { showToast } = useToastService();

    const [pixKeyType, setPixKeyType] = useState<PixKeyType | null>(
        wallet?.pixKeyType ?? null
    );
    const [pixKey, setPixKey] = useState(wallet?.pixKey ?? '');
    const [bankName, setBankName] = useState(wallet?.bankName ?? '');
    const [bankAgency, setBankAgency] = useState(wallet?.bankAgency ?? '');
    const [bankAccount, setBankAccount] = useState(wallet?.bankAccount ?? '');
    const [touched, setTouched] = useState(false);

    // Erro derivado — só aparece quando o usuário começou a editar.
    const pixError = useMemo(
        () => (touched ? validatePixKey(pixKey, pixKeyType) : null),
        [pixKey, pixKeyType, touched],
    );

    const placeholder = pixKeyType ? PIX_KEY_HINTS[pixKeyType] : 'Informe sua chave PIX';

    async function handleSave() {
        setTouched(true);
        const error = validatePixKey(pixKey, pixKeyType);
        if (error) {
            showToast({ message: error, type: 'error' });
            return;
        }

        try {
            await updateBankInfo({
                pixKeyType: pixKeyType ?? undefined,
                pixKey: pixKey.trim() || undefined,
                bankName: bankName.trim() || undefined,
                bankAgency: bankAgency.trim() || undefined,
                bankAccount: bankAccount.trim() || undefined,
            });
            showToast({ message: 'Dados bancários atualizados com sucesso!', type: 'success' });
        } catch {
            showToast({ message: 'Não foi possível atualizar os dados bancários.', type: 'error' });
        }
    }

    if (isLoading) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} >
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset='textTitleScreen'>Dados bancários</Text>}>
            <ScrollView>
                <Box pt="t16">

                    {/* PIX Section */}
                    <Box mt="t24">
                        <Text fontSize={measure.m16} fontWeightPreset='bold' mb="b12">
                            Chave PIX
                        </Text>

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
                                    borderColor={pixKeyType === type ? 'primary100' : 'background'}
                                    bg={pixKeyType === type ? 'primary10' : 'background'}
                                    onPress={() => {
                                        setPixKeyType(type as PixKeyType);
                                        setTouched(true);
                                    }}
                                >
                                    <Text
                                        fontSize={measure.m12}
                                        fontWeightPreset='semibold'
                                        color={pixKeyType === type ? 'primary100' : 'colorTextPrimary'}
                                    >
                                        {label}
                                    </Text>
                                </TouchableOpacityBox>
                            ))}
                        </Box>

                        <Input
                            placeholder={placeholder}
                            value={pixKey}
                            onChangeText={(t) => {
                                setPixKey(t);
                                if (!touched) setTouched(true);
                            }}
                            messageError={pixError ?? undefined}
                        />
                        {!pixError && pixKeyType && (
                            <Text fontSize={measure.m12} color="colorTextSecondary" mt="t4">
                                Formato esperado: {PIX_KEY_HINTS[pixKeyType]}
                            </Text>
                        )}
                    </Box>

                    {/* Bank Account Section (Optional) */}
                    <Box mt="t32">
                        <Box flexDirection="row" alignItems="center" mb="b12">
                            <Text fontSize={measure.m16} fontWeightPreset='bold'>
                                Dados bancários (opcional)
                            </Text>
                        </Box>

                        <Text fontSize={measure.m12} color="colorTextSecondary" mb="b12">
                            Preencha caso prefira receber via TED/DOC
                        </Text>

                        <Box mb="b12">
                            <Text fontSize={measure.m14} color="colorTextSecondary" mb="b4">
                                Banco
                            </Text>
                            <Input
                                placeholder="Nome do banco"
                                value={bankName}
                                onChangeText={setBankName}
                            />
                        </Box>

                        <Box flexDirection="row" gap="x12">
                            <Box flex={1}>
                                <Text fontSize={measure.m14} color="colorTextSecondary" mb="b4">
                                    Agência
                                </Text>
                                <Input
                                    placeholder="0000"
                                    value={bankAgency}
                                    onChangeText={setBankAgency}
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
                                    value={bankAccount}
                                    onChangeText={setBankAccount}
                                    keyboardType="numeric"
                                    width={measure.x160}
                                />
                            </Box>
                        </Box>
                    </Box>

                    {/* Info Box */}
                    <Box
                        mt="t24"
                        p="m16"
                        borderRadius="s12"
                        flexDirection="row"
                    >
                        <Ionicons name="information-circle-outline" size={measure.m20} color="#2196F3" />
                        <Text ml="l8" fontSize={measure.m12} color="colorTextSecondary" flex={1}>
                            A chave PIX é a forma mais rápida de receber seus saques.
                            Os dados bancários serão utilizados caso não seja possível realizar via PIX.
                        </Text>
                    </Box>

                    {/* Submit Button */}
                    <Box mt="t32" mb="b32">
                        <Button
                            title="Salvar dados"
                            onPress={handleSave}
                            isLoading={isPending}
                            disabled={!pixKey.trim() || !pixKeyType}
                        />
                    </Box>
                </Box>
            </ScrollView>
        </ScreenBase>
    );
}
