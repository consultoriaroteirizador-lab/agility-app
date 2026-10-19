import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform } from 'react-native';

import type { ImagePickerAsset } from 'expo-image-picker';

import { Box, Text, TouchableOpacityBox, Button, Input, ScreenBase } from '@/components';
import MultiPhotoPicker from '@/components/MultiPhotoPicker/MultiPhotoPicker';
import type { ServiceLine } from '@/domain/agility/service/dto/response/service-line.response';
import { uploadMultipleServicePhotos } from '@/domain/agility/service/serviceUploadUtils';
import { useAppSafeArea } from '@/hooks';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { acceptUploadResult, buildCheckPayload, canConfirm, isQuantityValid as checkQuantity, photoRequirement } from './itemCheckPhoto';
import type { CheckData, CheckStatus } from './itemCheckPhoto';
import { getCheckTexts, quantityTitle } from './itemCheckTexts';
import type { CheckContext } from './itemCheckTexts';

interface ItemCheckModalProps {
    visible: boolean;
    item: ServiceLine | null;
    onClose: () => void;
    onConfirm: (data: CheckData) => void;
    loading?: boolean;
    /** Contexto do check (textos e opções); padrão: entrega. */
    context?: CheckContext;
}

const DEFAULT_STATE = {
    status: 'CHECKED' as CheckStatus,
    actualQuantity: '',
    notes: '',
};

export function ItemCheckModal({ visible, item, onClose, onConfirm, loading, context = 'delivery' }: ItemCheckModalProps) {
    const { top } = useAppSafeArea();
    const [status, setStatus] = useState<CheckStatus>(DEFAULT_STATE.status);
    const [actualQuantity, setActualQuantity] = useState(DEFAULT_STATE.actualQuantity);
    const [notes, setNotes] = useState(DEFAULT_STATE.notes);
    // Uma foto por linha: o asset local (miniatura) e a URL devolvida pelo upload.
    const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
    const [photoUrl, setPhotoUrl] = useState<string | undefined>();
    const [uploading, setUploading] = useState(false);
    const { showToast } = useToastService();
    // Geração do upload: reset e cada troca/remoção de foto a incrementam (ver acceptUploadResult).
    const uploadGeneration = useRef(0);

    // Reseta o estado toda vez que o modal abre/fecha
    useEffect(() => {
        if (!visible) {
            uploadGeneration.current += 1;
            setStatus(DEFAULT_STATE.status);
            setActualQuantity(DEFAULT_STATE.actualQuantity);
            setNotes(DEFAULT_STATE.notes);
            setPhoto(null);
            setPhotoUrl(undefined);
            setUploading(false);
        }
    }, [visible]);

    if (!visible || !item) return null;

    const texts = getCheckTexts(context);
    const statusOptions = texts.statuses.map((value) => ({
        value,
        label: texts.labels[value],
        description: texts.descriptions[value],
    }));

    const handlePhotosChange = async (assets: ImagePickerAsset[]) => {
        uploadGeneration.current += 1;
        const generation = uploadGeneration.current;
        const next = assets[assets.length - 1];
        if (!next) {
            setUploading(false);
            setPhoto(null);
            setPhotoUrl(undefined);
            return;
        }
        setPhoto(next);
        setPhotoUrl(undefined);
        setUploading(true);
        try {
            const [url] = await uploadMultipleServicePhotos([next]);
            if (!url) throw new Error('upload sem URL');
            if (acceptUploadResult(generation, uploadGeneration.current)) setPhotoUrl(url);
        } catch {
            if (!acceptUploadResult(generation, uploadGeneration.current)) return;
            // Nada é confirmado: a foto sai da tela e o motorista tenta de novo.
            setPhoto(null);
            showToast({ message: 'Não foi possível enviar a foto. Tente novamente.', type: 'error' });
        } finally {
            if (acceptUploadResult(generation, uploadGeneration.current)) setUploading(false);
        }
    };

    const isPartial = status === 'PARTIAL';
    const isDamaged = status === 'DAMAGED';
    // "Quantidade entregue" aparece em PARTIAL (obrigatório) e DAMAGED (opcional —
    // ex.: entreguei 1, o outro veio danificado). O restante volta ao CD.
    const needsQuantity = isPartial || isDamaged;
    const isQuantityValid = checkQuantity({ status, quantity: item.quantity, actualQuantity });
    const photoNeed = photoRequirement(status);
    const confirmInput = { status, quantity: item.quantity, actualQuantity, notes, photoUrl, uploading };
    const isConfirmDisabled = loading || !canConfirm(confirmInput);

    const handleConfirm = () => {
        onConfirm(buildCheckPayload(confirmInput));
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
                            <Box flexDirection="row" flexWrap="wrap" gap="x8" marginTop="y4">
                                <Text preset="text14" color="gray400">
                                    Quantidade: {item.quantity} {item.unit ?? 'un'}
                                </Text>
                                {!!item.sku && (
                                    <Text preset="text14" color="gray400">
                                        • SKU: {item.sku}
                                    </Text>
                                )}
                                {!!item.serialNumber && (
                                    <Text preset="text14" color="gray400">
                                        {`• S/N: ${item.serialNumber}`}
                                    </Text>
                                )}
                            </Box>
                        </Box>

                        {/* Opções de status */}
                        <Box gap="y8">
                            <Text preset="text14" color="colorTextPrimary" fontWeightPreset="semibold">
                                Status:
                            </Text>
                            {statusOptions.map((option) => {
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

                        {/* Quantidade entregue — PARTIAL (obrigatório) e DAMAGED (opcional) */}
                        {needsQuantity && (
                            <Box>
                                <Input
                                    title={quantityTitle(texts, isPartial)}
                                    borderType="all"
                                    value={actualQuantity}
                                    onChangeText={setActualQuantity}
                                    placeholder={`Máx: ${item.quantity}`}
                                    keyboardType="numeric"
                                />
                                {isDamaged && !!texts.damagedQuantityHint && (
                                    <Text preset="text12" color="gray400">
                                        {texts.damagedQuantityHint}
                                    </Text>
                                )}
                                {!!actualQuantity && !isQuantityValid && (
                                    <Text preset="text12" color="redError">
                                        Quantidade não pode exceder {item.quantity} {item.unit ?? 'un'}
                                    </Text>
                                )}
                            </Box>
                        )}

                        {/* Foto — obrigatória em DAMAGED, opcional em PARTIAL/REFUSED */}
                        {photoNeed !== 'none' && (
                            <Box>
                                <MultiPhotoPicker
                                    label={photoNeed === 'required' ? 'Foto da avaria (obrigatória)' : 'Foto (opcional)'}
                                    photos={photo ? [photo] : []}
                                    onPhotosChange={handlePhotosChange}
                                    maxPhotos={1}
                                    padding="m0"
                                />
                                {uploading && (
                                    <Text preset="text12" color="gray400">Enviando foto...</Text>
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