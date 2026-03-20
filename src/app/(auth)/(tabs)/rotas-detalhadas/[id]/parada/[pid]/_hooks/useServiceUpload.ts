import { useCallback } from 'react';

import * as ImagePicker from 'expo-image-picker'

import {
    uploadMultipleServicePhotos,
    uploadBase64Signature,
} from '@/domain/agility/service/serviceUploadUtils';
import { useToastService } from '@/services/Toast/useToast';

import { useParada } from '../_context/ParadaContext'

interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

/**
 * Hook para gerenciar upload de photos e signature
 */
export function useServiceUpload() {
    const {
        serviceId,
        photos,
        signature,
        setPhotos,
        setSignature,
        uploadProgress,
        setUploadProgress,
    } = useParada();
    const { showToast } = useToastService();

    // Upload de photos
    const uploadPhotos = useCallback(async (): Promise<string[]> => {
        if (!photos || photos.length === 0) return [];

        try {
            setUploadProgress(new Map());

            const urls = await uploadMultipleServicePhotos(
                photos,
                serviceId,
                'before',
                (progress: UploadProgress | null, index: number) => {
                    if (progress) {
                        // Use functional update to avoid creating new Map on each update
                        setUploadProgress(prev => {
                            const newMap = new Map(prev);
                            newMap.set(index, progress);
                            return newMap;
                        });
                    }
                },
            );

            setUploadProgress(new Map());
            return urls;
        } catch (error: unknown) {
            console.error('Erro ao fazer upload de photos:', error);

            // Verificar se é erro de S3 não configurado
            const errorMessage = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
            if (errorMessage?.includes('S3 storage is required')) {
                console.warn('[useServiceUpload] S3 não configurado - photos não serão enviadas');
                // Não mostrar alerta para não interromper o fluxo
                // O serviço será completado sem as photos
            } else {
                showToast({ message: 'Não foi possível fazer upload das photos.', type: 'error' });
            }
            return [];
        }
    }, [photos, serviceId, setUploadProgress]);

    // Upload de signature
    const uploadSignature = useCallback(async (base64Signature: string): Promise<string | null> => {
        if (!base64Signature) return null;

        try {
            const url = await uploadBase64Signature(base64Signature, serviceId)
            return url
        } catch (error: unknown) {
            console.error('Erro ao fazer upload da signature:', error);

            // Verificar se é erro de S3 não configurado
            const errorMessage = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
            if (errorMessage?.includes('S3 storage is required')) {
                console.warn('[useServiceUpload] S3 não configurado - signature não será enviada');
                // Não mostrar alerta para não interromper o fluxo
                // O serviço será completado sem a signature
            } else {
                showToast({ message: 'Não foi possível fazer upload da assinatura.', type: 'error' });
            }
            return null;
        }
    }, [serviceId]);

    // Selecionar imagem da galeria
    const pickImages = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: 5 - (photos?.length || 0),
                quality: 0.8,
                orderedSelection: true,
            });

            if (!result.canceled && result.assets) {
                setPhotos([...photos, ...result.assets]);
            }
        } catch (error) {
            console.error('Erro ao selecionar imagem:', error);
            showToast({ message: 'Não foi possível selecionar a imagem.', type: 'error' });
        }
    }, [photos, setPhotos]);

    // Tirar foto com a câmera
    const takePhoto = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                showToast({ message: 'Precisamos de permissão para usar a câmera!', type: 'error' });
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                setPhotos([...photos, result.assets[0]]);
            }
        } catch (error) {
            console.error('Erro ao tirar foto:', error);
            showToast({ message: 'Não foi possível tirar a foto.', type: 'error' });
        }
    }, [photos, setPhotos]);

    // Remover foto
    const removePhoto = useCallback((index: number) => {
        const newPhotos = photos.filter((_, i) => i !== index);
        setPhotos(newPhotos);
    }, [photos, setPhotos]);

    // Salvar signature
    const saveAssinatura = useCallback((signatureData: string) => {
        setSignature(signatureData);
    }, [setSignature]);

    // Limpar signature
    const clearAssinatura = useCallback(() => {
        setSignature(null);
    }, [setSignature]);

    return {
        // Estado
        photos,
        signature,
        uploadProgress,
        canAddMorePhotos: (photos?.length || 0) < 5,

        // Ações de foto
        pickImages,
        takePhoto,
        removePhoto,
        uploadPhotos,

        // Ações de signature
        saveAssinatura,
        clearAssinatura,
        uploadSignature,
    };
}
