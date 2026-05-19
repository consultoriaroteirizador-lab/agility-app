import { useCallback } from 'react';

import * as ImagePicker from 'expo-image-picker'
import type { ImagePickerAsset } from 'expo-image-picker'

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
 * Internal upload-state attached to an ImagePickerAsset. The asset object is
 * mutated in place (and a new array is set) once the upload completes, so
 * downstream consumers that just read `photo.uri` still work — the URI is
 * swapped to the S3 URL when the upload succeeds.
 *
 * NOTE: `uri` keeps pointing to the local file *until* the upload finishes;
 * after that, it is replaced by the S3 URL so the UI seamlessly switches to
 * the remote image and a force-kill no longer loses evidence.
 */
type UploadStatus = 'uploading' | 'uploaded' | 'failed'

export interface PhotoAsset extends ImagePickerAsset {
    __s3Url?: string
    __uploadStatus?: UploadStatus
    __localUri?: string
}

const isS3Url = (uri: string | undefined | null): boolean =>
    !!uri && (uri.startsWith('http://') || uri.startsWith('https://'))

const isBase64Payload = (value: string | undefined | null): boolean =>
    !!value && value.startsWith('data:')

/**
 * Hook para gerenciar upload de photos e signature.
 *
 * Estratégia de upload incremental:
 *  - `takePhoto` / `pickImages` enfileiram um upload imediato após capturar o asset
 *    e atualizam `photos[i].__s3Url` / `__uploadStatus` quando termina.
 *  - `uploadPhotos()` e `uploadSignature()` continuam disponíveis para retro-compatibilidade
 *    com `useServiceCompletion`. Eles são *idempotentes*: se as fotos/assinatura já
 *    foram enviadas, retornam imediatamente as URLs em memória; senão, fazem o
 *    upload de quem ainda está pendente (recuperação de falhas).
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

    const photoAssets = photos as PhotoAsset[]

    const updatePhotoByLocalUri = useCallback(
        (localUri: string, patch: Partial<PhotoAsset>) => {
            setPhotos(prev => {
                const current = prev as PhotoAsset[]
                return current.map(p =>
                    (p.__localUri ?? p.uri) === localUri ? { ...p, ...patch } : p,
                ) as ImagePicker.ImagePickerAsset[]
            })
        },
        [setPhotos],
    )

    // Sobe imediatamente uma foto recém-capturada. Em sucesso, troca `uri` por URL S3 e
    // marca __uploadStatus='uploaded'. Em falha, marca __uploadStatus='failed' para
    // que o usuário possa tocar e tentar de novo.
    const uploadAssetIncremental = useCallback(async (asset: PhotoAsset) => {
        const localUri = asset.__localUri ?? asset.uri
        try {
            const urls = await uploadMultipleServicePhotos([asset], serviceId, 'before')
            const s3Url = urls[0]
            if (s3Url) {
                updatePhotoByLocalUri(localUri, {
                    uri: s3Url,
                    __s3Url: s3Url,
                    __uploadStatus: 'uploaded',
                    __localUri: localUri,
                })
            } else {
                updatePhotoByLocalUri(localUri, { __uploadStatus: 'failed', __localUri: localUri })
            }
        } catch (error) {
            if (__DEV__) {
                console.warn('[useServiceUpload] incremental photo upload failed:', error)
            }
            updatePhotoByLocalUri(localUri, { __uploadStatus: 'failed', __localUri: localUri })
        }
    }, [serviceId, updatePhotoByLocalUri])

    const retryPhotoUpload = useCallback(async (index: number) => {
        const asset = photoAssets[index]
        if (!asset || asset.__uploadStatus === 'uploaded') return
        updatePhotoByLocalUri(asset.__localUri ?? asset.uri, { __uploadStatus: 'uploading' })
        await uploadAssetIncremental(asset)
    }, [photoAssets, updatePhotoByLocalUri, uploadAssetIncremental])

    // Upload em lote (idempotente). Usado pelo handleFinalizar como rede de segurança:
    // se alguma foto ainda estiver pendente, sobe agora e retorna todas as URLs.
    const uploadPhotos = useCallback(async (): Promise<string[]> => {
        if (!photoAssets || photoAssets.length === 0) return [];

        const pending = photoAssets.filter(p => !p.__s3Url && p.__uploadStatus !== 'uploaded' && !isS3Url(p.uri))
        if (pending.length === 0) {
            return photoAssets
                .map(p => p.__s3Url ?? (isS3Url(p.uri) ? p.uri : undefined))
                .filter((u): u is string => !!u)
        }

        try {
            setUploadProgress(new Map());

            const urls = await uploadMultipleServicePhotos(
                pending,
                serviceId,
                'before',
                (progress: UploadProgress | null, index: number) => {
                    if (progress) {
                        setUploadProgress(prev => {
                            const newMap = new Map(prev);
                            newMap.set(index, progress);
                            return newMap;
                        });
                    }
                },
            );

            // Map each pending asset to its URL by position
            pending.forEach((asset, i) => {
                const url = urls[i]
                if (!url) return
                updatePhotoByLocalUri(asset.__localUri ?? asset.uri, {
                    uri: url,
                    __s3Url: url,
                    __uploadStatus: 'uploaded',
                    __localUri: asset.__localUri ?? asset.uri,
                })
            })

            setUploadProgress(new Map());

            const allUrls = photoAssets.map(p => {
                if (p.__s3Url) return p.__s3Url
                if (isS3Url(p.uri)) return p.uri
                const matchedIndex = pending.indexOf(p)
                return matchedIndex >= 0 ? urls[matchedIndex] : undefined
            }).filter((u): u is string => !!u)

            return allUrls
        } catch (error: unknown) {
            console.error('Erro ao fazer upload de photos:', error);

            const errorMessage = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
            if (errorMessage?.includes('S3 storage is required')) {
                console.warn('[useServiceUpload] S3 não configurado - photos não serão enviadas');
            } else {
                showToast({ message: 'Não foi possível fazer upload das photos.', type: 'error' });
            }
            // Even on batch failure, return what's already uploaded
            return photoAssets
                .map(p => p.__s3Url ?? (isS3Url(p.uri) ? p.uri : undefined))
                .filter((u): u is string => !!u)
        }
    }, [photoAssets, serviceId, setUploadProgress, showToast, updatePhotoByLocalUri]);

    // Upload de signature (idempotente). Aceita base64 OU URL — se já é URL, retorna como está.
    const uploadSignature = useCallback(async (signatureData: string): Promise<string | null> => {
        if (!signatureData) return null;
        if (isS3Url(signatureData)) {
            return signatureData
        }

        try {
            const url = await uploadBase64Signature(signatureData, serviceId)
            return url
        } catch (error: unknown) {
            console.error('Erro ao fazer upload da signature:', error);

            const errorMessage = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
            if (errorMessage?.includes('S3 storage is required')) {
                console.warn('[useServiceUpload] S3 não configurado - signature não será enviada');
            } else {
                showToast({ message: 'Não foi possível fazer upload da assinatura.', type: 'error' });
            }
            return null;
        }
    }, [serviceId, showToast]);

    // Selecionar imagem da galeria
    const pickImages = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: 5 - (photoAssets?.length || 0),
                quality: 0.8,
                orderedSelection: true,
            });

            if (!result.canceled && result.assets) {
                const newAssets: PhotoAsset[] = result.assets.map(a => ({
                    ...a,
                    __localUri: a.uri,
                    __uploadStatus: 'uploading',
                }))
                setPhotos([...photoAssets, ...newAssets]);

                // Fire-and-forget incremental upload for each new asset
                newAssets.forEach(asset => { void uploadAssetIncremental(asset) })
            }
        } catch (error) {
            console.error('Erro ao selecionar imagem:', error);
            showToast({ message: 'Não foi possível selecionar a imagem.', type: 'error' });
        }
    }, [photoAssets, setPhotos, showToast, uploadAssetIncremental]);

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
                const asset: PhotoAsset = {
                    ...result.assets[0],
                    __localUri: result.assets[0].uri,
                    __uploadStatus: 'uploading',
                }
                setPhotos([...photoAssets, asset]);
                void uploadAssetIncremental(asset)
            }
        } catch (error) {
            console.error('Erro ao tirar foto:', error);
            showToast({ message: 'Não foi possível tirar a foto.', type: 'error' });
        }
    }, [photoAssets, setPhotos, showToast, uploadAssetIncremental]);

    // Remover foto (MVP: não deleta do S3; cleanup job posterior)
    const removePhoto = useCallback((index: number) => {
        const newPhotos = photoAssets.filter((_, i) => i !== index);
        setPhotos(newPhotos);
    }, [photoAssets, setPhotos]);

    // Salvar signature: sobe em background e substitui o base64 pela URL no contexto
    const saveAssinatura = useCallback((signatureData: string) => {
        setSignature(signatureData);
        if (signatureData && isBase64Payload(signatureData)) {
            // Fire-and-forget
            uploadBase64Signature(signatureData, serviceId)
                .then(url => {
                    if (url) setSignature(url)
                })
                .catch(err => {
                    if (__DEV__) {
                        console.warn('[useServiceUpload] incremental signature upload failed:', err)
                    }
                    // Leave the base64 in place; uploadSignature() at finalize will retry.
                })
        }
    }, [setSignature, serviceId]);

    // Limpar signature
    const clearAssinatura = useCallback(() => {
        setSignature(null);
    }, [setSignature]);

    return {
        // Estado
        photos: photoAssets,
        signature,
        uploadProgress,
        canAddMorePhotos: (photoAssets?.length || 0) < 5,

        // Ações de foto
        pickImages,
        takePhoto,
        removePhoto,
        retryPhotoUpload,
        uploadPhotos,

        // Ações de signature
        saveAssinatura,
        clearAssinatura,
        uploadSignature,
    };
}
