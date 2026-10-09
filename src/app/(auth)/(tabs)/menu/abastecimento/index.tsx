// src/app/(auth)/(tabs)/menu/abastecimento/index.tsx

import React, { useState } from 'react';
import { ScrollView, Switch } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ActivityIndicator, Box, BRLInput, Button, Input, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import {
    FUEL_LABEL,
    FUEL_TYPES,
    formatKm,
    fuelEntryErrorMessage,
    fuelEntrySuccessToast,
    useCreateFuelEntry,
    useFuelEntryContext,
    validateFuelForm,
    type FuelFormState,
    type FuelPayer,
    type FuelType,
} from '@/domain/agility/fuelEntry';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

type Campos = Omit<FuelFormState, 'fuelType'>;
const INICIAL: Campos = { litersText: '', totalValueCents: null, odometerText: '', fullTank: true, paidBy: 'COMPANY', stationName: '', photo: null };
const PAGADORES: { value: FuelPayer; label: string }[] = [
    { value: 'COMPANY', label: 'Empresa' },
    { value: 'DRIVER', label: 'Eu' },
];

function Chip({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
    return (
        <TouchableOpacityBox
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={onPress}
            px="x16"
            py="y8"
            borderRadius="s8"
            borderWidth={1}
            borderColor={selected ? 'primary100' : 'gray200'}
            backgroundColor={selected ? 'primary10' : undefined}
        >
            <Text>{label}</Text>
        </TouchableOpacityBox>
    );
}

export default function AbastecerScreen() {
    const router = useRouter();
    const { showToast } = useToastService();
    const { context, isLoading, isError, error, refetch } = useFuelEntryContext();
    const { createFuelEntry } = useCreateFuelEntry();
    const { run, isSubmitting } = useSubmitLock();
    const [campos, setCampos] = useState<Campos>(INICIAL);
    const [escolhido, setEscolhido] = useState<FuelType | null>(null);
    const update = (patch: Partial<Campos>) => setCampos((c) => ({ ...c, ...patch }));

    const titulo = <Text preset="textTitleScreen">Abastecer</Text>;

    if (isLoading) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={titulo}>
                <Box flex={1} justifyContent="center" alignItems="center">
                    <ActivityIndicator size="large" />
                </Box>
            </ScreenBase>
        );
    }

    // Sem contexto não há placa nem veículo: o 422 do back diz o motivo (sem veículo, outra filial, elétrico).
    if (isError || !context) {
        return (
            <ScreenBase buttonLeft={<ButtonBack />} title={titulo}>
                <Box flex={1} justifyContent="center" alignItems="center" p="m24">
                    <Ionicons name="alert-circle" size={40} color="#F44336" />
                    <Text mt="t16" color="colorTextSecondary" textAlign="center">
                        {fuelEntryErrorMessage(error)}
                    </Text>
                    <TouchableOpacityBox testID="abastecer-contexto-erro" accessibilityRole="button" mt="t16" p="m12" onPress={() => refetch()}>
                        <Text color="colorTextPrimary" fontWeightPreset="semibold">
                            Tentar novamente
                        </Text>
                    </TouchableOpacityBox>
                </Box>
            </ScreenBase>
        );
    }

    const fuelType = escolhido ?? context.defaultFuelType;
    const { payload, problem } = validateFuelForm({ ...campos, fuelType });

    async function handleEnviar() {
        if (!payload || !campos.photo) return;
        const photo = campos.photo;
        await run(async () => {
            try {
                const entry = await createFuelEntry({ payload, photo });
                showToast(fuelEntrySuccessToast(entry));
                // `replace`: voltar não reabre o formulário preenchido.
                router.replace('/menu/abastecimento/historico');
            } catch (e) {
                // O que foi digitado fica: a tela não sai daqui no erro.
                showToast({ message: fuelEntryErrorMessage(e), type: 'error' });
            }
        });
    }

    return (
        <ScreenBase buttonLeft={<ButtonBack />} title={titulo}>
            <ScrollView keyboardShouldPersistTaps="handled">
                <Box pt="t16" gap="y16">
                    <Box>
                        <Text fontSize={measure.m14} color="colorTextSecondary">
                            Veículo
                        </Text>
                        <Text fontSize={measure.m20} fontWeightPreset="bold">
                            {context.plate}
                        </Text>
                    </Box>

                    <Box>
                        <Text fontSize={measure.m14} fontWeightPreset="semibold" mb="b8">
                            Combustível
                        </Text>
                        <Box flexDirection="row" gap="x8">
                            {FUEL_TYPES.map((f) => (
                                <Chip key={f} selected={fuelType === f} label={FUEL_LABEL[f]} onPress={() => setEscolhido(f)} />
                            ))}
                        </Box>
                    </Box>

                    <Input
                        title="Litros"
                        placeholder="Ex.: 45,5"
                        keyboardType="decimal-pad"
                        value={campos.litersText}
                        onChangeText={(litersText: string) => update({ litersText })}
                    />

                    <Box>
                        <Text fontSize={measure.m14} fontWeightPreset="semibold" mb="b8">
                            Valor total
                        </Text>
                        <BRLInput valueCents={campos.totalValueCents} onChangeCents={(totalValueCents: number | null) => update({ totalValueCents })} placeholder="R$ 0,00" />
                    </Box>

                    <Box>
                        <Input
                            title="Odômetro do painel (km)"
                            placeholder="Ex.: 48210"
                            keyboardType="number-pad"
                            value={campos.odometerText}
                            onChangeText={(odometerText: string) => update({ odometerText })}
                        />
                        {context.lastOdometerKm !== null && (
                            <Text mt="t4" fontSize={measure.m12} color="colorTextSecondary">
                                {`Último registrado: ${formatKm(context.lastOdometerKm)}`}
                            </Text>
                        )}
                    </Box>

                    <Box flexDirection="row" alignItems="center" justifyContent="space-between">
                        <Text fontSize={measure.m14} fontWeightPreset="semibold">
                            Tanque cheio
                        </Text>
                        <Switch value={campos.fullTank} onValueChange={(fullTank) => update({ fullTank })} />
                    </Box>

                    <Box>
                        <Text fontSize={measure.m14} fontWeightPreset="semibold" mb="b8">
                            Quem pagou
                        </Text>
                        <Box flexDirection="row" gap="x8">
                            {PAGADORES.map((p) => (
                                <Chip key={p.value} selected={campos.paidBy === p.value} label={p.label} onPress={() => update({ paidBy: p.value })} />
                            ))}
                        </Box>
                    </Box>

                    <Input
                        title="Posto (opcional)"
                        placeholder="Nome do posto"
                        maxLength={120}
                        value={campos.stationName}
                        onChangeText={(stationName: string) => update({ stationName })}
                    />

                    <MultiPhotoPicker
                        label="Foto da nota"
                        maxPhotos={1}
                        allowGallery={false}
                        photos={campos.photo ? [campos.photo as never] : []}
                        onPhotosChange={(fotos) => update({ photo: fotos[0] ? { uri: fotos[0].uri, width: fotos[0].width, height: fotos[0].height } : null })}
                    />

                    <Box mt="t8">
                        <Button title="Enviar" onPress={handleEnviar} isLoading={isSubmitting} disabled={!payload || isSubmitting} />
                    </Box>

                    {problem && (
                        <Text fontSize={measure.m12} color="colorTextSecondary" textAlign="center">
                            {problem}
                        </Text>
                    )}

                    <TouchableOpacityBox testID="abastecer-historico" mb="b24" alignItems="center" onPress={() => router.push('/menu/abastecimento/historico')}>
                        <Text color="colorTextPrimary">Meus abastecimentos</Text>
                    </TouchableOpacityBox>
                </Box>
            </ScrollView>
        </ScreenBase>
    );
}
