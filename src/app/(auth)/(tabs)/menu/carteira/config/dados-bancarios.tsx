// src/app/(auth)/(tabs)/menu/carteira/config/dados-bancarios.tsx

import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Box, Text, ScreenBase, ActivityIndicator, Input, Button, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { useGetWallet, useUpdateBankInfo } from '@/domain/agility/wallet';
import { PixKeyType } from '@/domain/agility/wallet/dto/types';
import { measure } from '@/theme';

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

    const [pixKeyType, setPixKeyType] = useState<PixKeyType | null>(
        wallet?.pixKeyType ?? null
    );
    const [pixKey, setPixKey] = useState(wallet?.pixKey ?? '');
    const [bankName, setBankName] = useState(wallet?.bankName ?? '');
    const [bankAgency, setBankAgency] = useState(wallet?.bankAgency ?? '');
    const [bankAccount, setBankAccount] = useState(wallet?.bankAccount ?? '');

    const handleSave = async () => {
        if (!pixKey.trim()) {
            Alert.alert('Campo obrigatório', 'Informe uma chave PIX');
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
            Alert.alert('Sucesso', 'Dados bancários atualizados com sucesso!');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível atualizar os dados bancários.');
        }
    };

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
                                    onPress={() => setPixKeyType(type as PixKeyType)}
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
                            placeholder="Informe sua chave PIX"
                            value={pixKey}
                            onChangeText={setPixKey}
                        />
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
                            disabled={!pixKey.trim()}
                        />
                    </Box>
                </Box>
            </ScrollView>
        </ScreenBase>
    );
}
