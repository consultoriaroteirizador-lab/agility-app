import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform } from 'react-native';

import { Box, Text, TouchableOpacityBox, Button, Input, ScreenBase } from '@/components';
import type { ServiceMaterialResponse } from '@/domain/agility/service/dto/response/service-material.response';
import { useAppSafeArea } from '@/hooks';
import { measure } from '@/theme';

type CheckStatus = 'CHECKED' | 'PARTIAL' | 'MISSING' | 'DAMAGED' | 'REFUSED';

interface CheckData {
    status: CheckStatus;
    actualQuantity?: number;
    notes?: string;
    photoProof?: string;
}

interface ItemCheckModalProps {
    visible: boolean;
    item: ServiceMaterialResponse | null;
    onClose: () => void;
    onConfirm: (data: CheckData) => void;
    loading?: boolean;
}

const STATUS_OPTIONS: { value: CheckStatus; label: string; description: string }[] = [
    { value: 'CHECKED', label: 'Entregue', description: 'Item entregue com sucesso' },
    { value: 'PARTIAL', label: 'Parcial', description: 'Entrega parcial' },
    { value: 'MISSING', label: 'Não encontrado', description: 'Item não estava disponível' },
    { value: 'DAMAGED', label: 'Danificado', description: 'Item chegou danificado' },
    { value: 'REFUSED', label: 'Recusado', description: 'Cliente recusou o item' },
];

const DEFAULT_STATE = {
    status: 'CHECKED' as CheckStatus,
    actualQuantity: '',
    notes: '',
};

export function ItemCheckModal({ visible, item, onClose, onConfirm, loading }: ItemCheckModalProps) {
    const { top } = useAppSafeArea();
    const [status, setStatus] = useState<CheckStatus>(DEFAULT_STATE.status);
    const [actualQuantity, setActualQuantity] = useState(DEFAULT_STATE.actualQuantity);
    const [notes, setNotes] = useState(DEFAULT_STATE.notes);

    // Reseta o estado toda vez que o modal abre/fecha
    useEffect(() => {
        if (!visible) {
            setStatus(DEFAULT_STATE.status);
            setActualQuantity(DEFAULT_STATE.actualQuantity);
            setNotes(DEFAULT_STATE.notes);
        }
    }, [visible]);

    if (!visible || !item) return null;

    const parsedQuantity = parseFloat(actualQuantity);
    const isPartial = status === 'PARTIAL';
    const isQuantityValid = !isPartial || (!!actualQuantity && parsedQuantity > 0 && parsedQuantity <= item.quantity);
    const isConfirmDisabled = loading || !isQuantityValid;

    const handleConfirm = () => {
        onConfirm({
            status,
            ...(isPartial && { actualQuantity: parsedQuantity }),
            ...(notes.trim() && { notes: notes.trim() }),
        });
    };

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={top}
            >
                <Box flex={1} style={{ paddingTop: top }}>
                    <ScreenBase
                        disableKeyboardAvoid
                        mtScreenBase='t0'
                        mbScreenBase='b0'
                        scrollable
                        buttonLeft={
                            <TouchableOpacityBox onPress={onClose} padding="x8">
                                <Text preset="text20" color="gray400">✕</Text>
                            </TouchableOpacityBox>
                        }
                        title={
                            <Text preset="text18" color="primary100" fontWeightPreset="semibold">
                                Check do Item
                            </Text>
                        }
                    >
                    <Box flex={1} gap="y12">
                        {/* Info do item */}
                        <Box backgroundColor="gray50" padding="y12" borderRadius="s12">
                            <Text preset="text16" color="colorTextPrimary" fontWeightPreset="bold">
                                {item.material}
                            </Text>
                            <Box flexDirection="row" gap="x8" marginTop="y4">
                                <Text preset="text14" color="gray400">
                                    Quantidade: {item.quantity} {item.unit ?? 'un'}
                                </Text>
                                {item.sku && (
                                    <Text preset="text14" color="gray400">
                                        • SKU: {item.sku}
                                    </Text>
                                )}
                            </Box>
                        </Box>

                        {/* Opções de status */}
                        <Box gap="y8">
                            <Text preset="text14" color="colorTextPrimary" fontWeightPreset="semibold">
                                Status:
                            </Text>
                            {STATUS_OPTIONS.map((option) => {
                                const isSelected = status === option.value;
                                return (
                                    <TouchableOpacityBox
                                        key={option.value}
                                        onPress={() => setStatus(option.value)}
                                        flexDirection="row"
                                        alignItems="center"
                                        padding="y10"
                                        paddingHorizontal="x12"
                                        borderWidth={measure.m1}
                                        borderColor={isSelected ? 'primary100' : 'gray200'}
                                        borderRadius="s8"
                                        backgroundColor={isSelected ? 'primary10' : 'white'}
                                        gap="x12"
                                    >
                                        <Box
                                            width={measure.x20}
                                            height={measure.y20}
                                            borderRadius="s10"
                                            borderWidth={measure.m2}
                                            borderColor={isSelected ? 'primary100' : 'gray300'}
                                            backgroundColor={isSelected ? 'primary100' : 'transparent'}
                                            justifyContent="center"
                                            alignItems="center"
                                        >
                                            {isSelected && (
                                                <Text preset="text12" color="white" fontWeightPreset="bold">✓</Text>
                                            )}
                                        </Box>
                                        <Box flex={1}>
                                            <Text preset="text14" color="colorTextPrimary" fontWeightPreset="semibold">
                                                {option.label}
                                            </Text>
                                            <Text preset="text12" color="gray400">
                                                {option.description}
                                            </Text>
                                        </Box>
                                    </TouchableOpacityBox>
                                );
                            })}
                        </Box>

                        {/* Quantidade real — só aparece quando PARTIAL */}
                        {isPartial && (
                            <Box>
                                <Input
                                    title="Quantidade entregue:"
                                    borderType="all"
                                    value={actualQuantity}
                                    onChangeText={setActualQuantity}
                                    placeholder={`Máx: ${item.quantity}`}
                                    keyboardType="numeric"
                                />
                                {!!actualQuantity && !isQuantityValid && (
                                    <Text preset="text12" color="redError">
                                        Quantidade não pode exceder {item.quantity} {item.unit ?? 'un'}
                                    </Text>
                                )}
                            </Box>
                        )}

                        {/* Observações */}
                        <Input
                            borderType="all"
                            title="Observações"
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Adicione observações..."
                            multiline
                            numberOfLines={3}
                        />

                        {/* Botões */}
                        <Box flexDirection="row" gap="x12" marginTop="y8">
                            <Box flex={1}>
                                <Button
                                    title="Confirmar"
                                    onPress={handleConfirm}
                                    disabled={isConfirmDisabled}
                                    width={measure.x150}
                                />
                            </Box>
                            <Box flex={1}>
                                <Button
                                    title="Cancelar"
                                    preset="outline"
                                    onPress={onClose}
                                    disabled={loading}
                                    width={measure.x150}
                                />
                            </Box>
                        </Box>
                    </Box>
                </ScreenBase>
                </Box>
            </KeyboardAvoidingView>
        </Modal>
    );
}