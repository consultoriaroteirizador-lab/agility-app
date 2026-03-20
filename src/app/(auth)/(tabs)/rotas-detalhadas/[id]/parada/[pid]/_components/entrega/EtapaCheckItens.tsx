import { useState, useCallback } from 'react';

import { Box, Button, ScreenBase, Text, ActivityIndicator } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { ItemCheckCard } from '@/components/ItemCheckCard';
import { ItemCheckModal } from '@/components/ItemCheckModal';
import type { ServiceMaterialResponse, MaterialStatus } from '@/domain/agility/service/dto/response/service-material.response';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';

type CheckStatus = 'CHECKED' | 'PARTIAL' | 'MISSING' | 'DAMAGED' | 'REFUSED';

/**
 * Etapa 3: Check dos itens da entrega
 * Motorista marca cada produto que está entregando
 */
export function EtapaCheckItens() {
    const {
        materialsState,
        checkMaterial,
        completeCheck,
        goToNextStep,
        goToPreviousStep,
    } = useParada();

    const [selectedItem, setSelectedItem] = useState<ServiceMaterialResponse | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [checking, setChecking] = useState(false);

    const handleOpenCheck = useCallback((item: ServiceMaterialResponse) => {
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
            const success = await checkMaterial(selectedItem.id, {
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
    }, [selectedItem, checkMaterial]);

    const pendingCount = materialsState.materials.filter(m => m.status === 'PENDING').length;
    const checkedCount = materialsState.materials.filter(m => m.status !== 'PENDING').length;

    const handleProximo = useCallback(() => {
        completeCheck();
        goToNextStep();
    }, [completeCheck, goToNextStep]);

    const handleBack = useCallback(() => {
        goToPreviousStep();
    }, [goToPreviousStep]);

    return (
        <ScreenBase
            buttonLeft={<ButtonBack onPress={handleBack} />}
            title={
                <Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
                    Check dos Itens
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
                                    Itens para entrega
                                </Text>
                                <Text
                                    preset="text20"
                                    color="colorTextPrimary"
                                    fontWeightPreset="bold"
                                    numberOfLines={1}
                                >
                                    {materialsState.materials.length} itens
                                </Text>
                            </Box>

                            <Box
                                paddingHorizontal="x12"
                                paddingVertical="y8"
                                borderRadius="s12"
                                backgroundColor={materialsState.allChecked ? 'primary10' : 'secondary10'}
                                flexShrink={0}
                            >
                                <Text
                                    preset="text14"
                                    color={materialsState.allChecked ? 'primary100' : 'secondary80'}
                                    fontWeightPreset="semibold"
                                    numberOfLines={1}
                                >
                                    {checkedCount}/{materialsState.materials.length} checados
                                </Text>
                            </Box>
                        </Box>

                        {/* Loading */}
                        {materialsState.loading && (
                            <Box justifyContent="center" alignItems="center" padding="y32">
                                <ActivityIndicator size="large" />
                                <Text preset="text14" color="gray400" marginTop="y12">
                                    Carregando itens...
                                </Text>
                            </Box>
                        )}

                        {/* Lista vazia */}
                        {!materialsState.loading && materialsState.materials.length === 0 && (
                            <Box justifyContent="center" alignItems="center" padding="y32">
                                <Text preset="text16" color="gray400" textAlign="center">
                                    Nenhum item cadastrado para esta entrega
                                </Text>
                            </Box>
                        )}

                        {/* Lista de itens */}
                        {!materialsState.loading && materialsState.materials.length > 0 && (
                            <Box>
                                {materialsState.materials.map((item) => (
                                    <ItemCheckCard
                                        key={item.id}
                                        item={item}
                                        onCheck={() => handleOpenCheck(item)}
                                    />
                                ))}
                            </Box>
                        )}

                        {/* Aviso de pendentes */}
                        {pendingCount > 0 && !materialsState.loading && (
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

                        {/* Botão Próximo */}
                        <Box marginTop="y24" paddingBottom="y24" alignItems="center">
                            <Button
                                title="Próximo"
                                onPress={handleProximo}
                                disabled={!materialsState.allChecked || materialsState.loading}
                                width={measure.x330}
                            />
                            {!materialsState.allChecked && (
                                <Text
                                    preset="text12"
                                    color="redError"
                                    textAlign="center"
                                    marginTop="y8"
                                >
                                    * Todos os itens devem ser checados antes de prosseguir
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
                />
            </Box>
        </ScreenBase>
    );
}