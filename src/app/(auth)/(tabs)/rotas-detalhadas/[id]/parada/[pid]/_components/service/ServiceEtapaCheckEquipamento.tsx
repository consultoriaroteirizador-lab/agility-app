import { useState, useCallback } from 'react';

import { router } from 'expo-router';

import { Box, Button, ScreenBase, Text, ActivityIndicator } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { ItemCheckCard } from '@/components/ItemCheckCard';
import { ItemCheckModal } from '@/components/ItemCheckModal';
import type { ServiceLine, MaterialStatus } from '@/domain/agility/service/dto/response/service-line.response';
import { pluralize } from '@/functions';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';

type CheckStatus = 'CHECKED' | 'PARTIAL' | 'MISSING' | 'DAMAGED' | 'REFUSED';

export function ServiceEtapaCheckEquipamento() {
    const {
        linesState,
        checkLine,
        completeCheck,
        serviceId,
    } = useParada();

    const [selectedItem, setSelectedItem] = useState<ServiceLine | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [checking, setChecking] = useState(false);

    const handleOpenCheck = useCallback((item: ServiceLine) => {
        setSelectedItem(item);
        setModalVisible(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setModalVisible(false);
        setSelectedItem(null);
    }, []);

    const handleConfirmCheck = useCallback(async (data: {
        status: CheckStatus;
        actualQuantity?: number;
        notes?: string;
        photoProof?: string;
    }) => {
        if (!selectedItem) return;

        setChecking(true);
        try {
            const success = await checkLine(selectedItem.id, {
                status: data.status as MaterialStatus,
                actualQuantity: data.actualQuantity,
                notes: data.notes,
                photoProof: data.photoProof,
            });

            if (success) {
                setModalVisible(false);
                setSelectedItem(null);
            }
        } finally {
            setChecking(false);
        }
    }, [selectedItem, checkLine]);

    const pendingCount = linesState.lines.filter(m => m.status === 'PENDING').length;
    const checkedCount = linesState.lines.filter(m => m.status !== 'PENDING').length;

    const handleBack = useCallback(() => {
        router.back();
    }, []);

    const handleConfirm = useCallback(() => {
        completeCheck();
    }, [completeCheck]);

    return (
        <ScreenBase
            buttonLeft={<ButtonBack onPress={handleBack} />}
            title={
                <Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
                    Check de Equipamentos
                </Text>
            }
        >
            <Box flex={1} backgroundColor="white">
                <Box scrollable style={{ paddingBottom: 32 }}>
                    <Box paddingTop="y24" paddingBottom="y4">
                        {/* Resumo */}
                        <Box
                            flexDirection="row"
                            justifyContent="space-between"
                            alignItems="center"
                            marginBottom="y16"
                        >
                            <Box flexShrink={1} marginRight="x12">
                                <Text preset="text14" color="gray600" numberOfLines={1}>
                                    Equipamentos para o serviço
                                </Text>
                                <Text
                                    preset="text20"
                                    color="colorTextPrimary"
                                    fontWeightPreset="bold"
                                    numberOfLines={1}
                                >
                                    {pluralize(linesState.lines.length, 'item', 'itens')}
                                </Text>
                            </Box>

                            {/* Verde quando tudo foi checado, laranja enquanto falta item.
                                Não dá para usar `primary*` no "completo": esta tela só existe
                                no fluxo de serviço, onde o tema pinta `primary*` do mesmo
                                laranja do "pendente" (ver `serviceTheme`). */}
                            <Box
                                paddingHorizontal="x12"
                                paddingVertical="y8"
                                borderRadius="s12"
                                backgroundColor={linesState.allChecked ? 'tertiary10' : 'secondary10'}
                                flexShrink={0}
                            >
                                <Text
                                    preset="text14"
                                    color={linesState.allChecked ? 'tertiary100' : 'secondary80'}
                                    fontWeightPreset="semibold"
                                    numberOfLines={1}
                                >
                                    {checkedCount}/{linesState.lines.length} checados
                                </Text>
                            </Box>
                        </Box>

                        {/* Loading */}
                        {linesState.loading && (
                            <Box justifyContent="center" alignItems="center" padding="y32">
                                <ActivityIndicator size="large" />
                                <Text preset="text14" color="gray400" marginTop="y12">
                                    Carregando equipamentos...
                                </Text>
                            </Box>
                        )}

                        {/* Lista vazia */}
                        {!linesState.loading && linesState.lines.length === 0 && (
                            <Box justifyContent="center" alignItems="center" padding="y32">
                                <Text preset="text16" color="gray400" textAlign="center">
                                    Nenhum equipamento cadastrado para este serviço
                                </Text>
                            </Box>
                        )}

                        {/* Lista de itens */}
                        {!linesState.loading && linesState.lines.length > 0 && (
                            <Box>
                                {linesState.lines.map((item) => (
                                    <ItemCheckCard
                                        key={item.id}
                                        item={item}
                                        onCheck={() => handleOpenCheck(item)}
                                    />
                                ))}
                            </Box>
                        )}

                        {/* Aviso de pendentes */}
                        {pendingCount > 0 && !linesState.loading && (
                            <Box
                                marginTop="y16"
                                paddingHorizontal="x12"
                                paddingVertical="y12"
                                backgroundColor="secondary10"
                                borderRadius="s12"
                            >
                                <Text preset="text14" color="secondary80" textAlign="center">
                                    Você ainda tem {pendingCount}{' '}
                                    {pendingCount === 1 ? 'item pendente' : 'itens pendentes'} para checar
                                </Text>
                            </Box>
                        )}

                        {/* Botão Confirmar */}
                        <Box marginTop="y24" paddingBottom="y24" alignItems="center">
                            <Button
                                title="Confirmar"
                                onPress={handleConfirm}
                                disabled={!linesState.allChecked || linesState.loading}
                                width={measure.x330}
                            />
                            {!linesState.allChecked && (
                                <Text
                                    preset="text12"
                                    color="redError"
                                    textAlign="center"
                                    marginTop="y8"
                                >
                                    * Todos os equipamentos devem ser checados antes de prosseguir
                                </Text>
                            )}
                        </Box>
                    </Box>
                </Box>

                {/* Modal de Check */}
                <ItemCheckModal
                    visible={modalVisible}
                    item={selectedItem}
                    onClose={handleCloseModal}
                    onConfirm={handleConfirmCheck}
                    loading={checking}
                    serviceId={serviceId}
                    context="equipment"
                />
            </Box>
        </ScreenBase>
    );
}
