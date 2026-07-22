import { useCallback, useEffect, useRef, useState } from 'react'

import * as ImagePicker from 'expo-image-picker'

import { uploadMultipleServicePhotos } from '@/domain/agility/service/serviceUploadUtils'
import { useGetServiceDraft, useSaveServiceDraft } from '@/domain/agility/service/useCase'
import {
    clearParadaDraft,
    loadParadaDraft,
    saveParadaDraft,
    type ParadaDraft,
} from '@/services/storage/paradaDraftStorage'

const SAVE_DEBOUNCE_MS = 800

export type InsucessoPhoto = ImagePicker.ImagePickerAsset & {
    __s3Url?: string
    __uploadStatus?: 'uploading' | 'uploaded' | 'failed'
    __localUri?: string
}

/**
 * Persistência do fluxo de insucesso (tela isolada, sem ParadaProvider).
 * Reusa a MESMA chave AsyncStorage e o MESMO Service.draftData no backend —
 * apenas opera nos campos `failureReason` / `failureNotes` / `failurePhotos`,
 * preservando o que outras telas (entrega/coleta/service) gravaram.
 */
export function useInsucessoDraft(serviceId: string | undefined) {
    const [selectedReason, setSelectedReasonState] = useState<string | null>(null)
    const [notes, setNotesState] = useState('')
    const [photos, setPhotosState] = useState<InsucessoPhoto[]>([])

    const hydratedRef = useRef<string | null>(null)
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const inFlightUploadsRef = useRef<Set<string>>(new Set())

    const {
        draft: backendDraft,
        draftUpdatedAt: backendDraftUpdatedAt,
        isFetched: backendDraftFetched,
    } = useGetServiceDraft(serviceId)
    const { saveDraft: saveBackendDraft } = useSaveServiceDraft()

    // Reset on serviceId change so hydration runs again
    useEffect(() => {
        hydratedRef.current = null
    }, [serviceId])

    // Hydration: load AsyncStorage + backend, pick most-recent failure fields.
    useEffect(() => {
        if (!serviceId || !backendDraftFetched) return
        if (hydratedRef.current === serviceId) return

        let cancelled = false
        const run = async () => {
            const localDraft = await loadParadaDraft(serviceId)
            if (cancelled) return

            const backendTs = backendDraftUpdatedAt ? new Date(backendDraftUpdatedAt).getTime() : 0
            const localTs = localDraft?.localUpdatedAt ?? 0
            const chosen = backendDraft && backendTs >= localTs ? backendDraft : (localDraft ?? backendDraft)

            if (chosen) {
                if (chosen.failureReason) setSelectedReasonState(chosen.failureReason)
                if (chosen.failureNotes !== undefined) setNotesState(chosen.failureNotes)
                if (chosen.failurePhotos && chosen.failurePhotos.length > 0) {
                    // `uri` = presigned (carrega no <Image>); `__s3Url` = chave (submissão).
                    const signed = chosen.failurePhotosSigned
                    const restored: InsucessoPhoto[] = chosen.failurePhotos.map((key, i) => ({
                        uri: signed?.[i] ?? key,
                        width: 0,
                        height: 0,
                        type: 'image',
                        __s3Url: key,
                        __uploadStatus: 'uploaded',
                        __localUri: signed?.[i] ?? key,
                    } as unknown as InsucessoPhoto))
                    setPhotosState(restored)
                }
            }

            hydratedRef.current = serviceId
        }

        void run()
        return () => {
            cancelled = true
        }
    }, [serviceId, backendDraftFetched, backendDraft, backendDraftUpdatedAt])

    // Auto-upload pending photos.
    useEffect(() => {
        if (!serviceId) return

        const pending = photos.filter(p => {
            if (p.__s3Url) return false
            if (p.uri.startsWith('http')) return false
            if (p.__uploadStatus === 'uploading') return false
            if (p.__uploadStatus === 'uploaded') return false
            if (p.__uploadStatus === 'failed') return false
            if (inFlightUploadsRef.current.has(p.uri)) return false
            return true
        })

        if (pending.length === 0) return

        const markedUris = new Set(pending.map(p => p.uri))
        pending.forEach(p => inFlightUploadsRef.current.add(p.uri))
        setPhotosState(prev =>
            prev.map(p =>
                markedUris.has(p.uri)
                    ? ({ ...p, __localUri: p.uri, __uploadStatus: 'uploading' } as InsucessoPhoto)
                    : p,
            ),
        )

        pending.forEach(async (asset) => {
            try {
                const urls = await uploadMultipleServicePhotos([asset], serviceId, 'before')
                const s3Url = urls[0]
                setPhotosState(prev =>
                    prev.map(p => {
                        const localKey = p.__localUri ?? p.uri
                        if (localKey !== asset.uri) return p
                        // NÃO trocar `uri` pela key do S3 (não é carregável pelo <Image>,
                        // miniatura em branco). Mantém o `uri` LOCAL pro preview e guarda
                        // a key em `__s3Url` — submissão e filtro de pendentes usam `__s3Url`.
                        return s3Url
                            ? ({ ...p, __s3Url: s3Url, __uploadStatus: 'uploaded', __localUri: localKey } as InsucessoPhoto)
                            : ({ ...p, __uploadStatus: 'failed', __localUri: localKey } as InsucessoPhoto)
                    }),
                )
            } catch (err) {
                if (__DEV__) {
                    console.warn('[useInsucessoDraft] photo upload failed:', err)
                }
                setPhotosState(prev =>
                    prev.map(p => {
                        const localKey = p.__localUri ?? p.uri
                        if (localKey !== asset.uri) return p
                        return { ...p, __uploadStatus: 'failed', __localUri: localKey } as InsucessoPhoto
                    }),
                )
            } finally {
                inFlightUploadsRef.current.delete(asset.uri)
            }
        })
    }, [photos, serviceId])

    // Auto-save: write the *failure* fields, preserving whatever else is in the local draft.
    useEffect(() => {
        if (!serviceId) return
        if (hydratedRef.current !== serviceId) return

        const failurePhotos = photos
            .map(p => p.__s3Url ?? (p.uri.startsWith('http') ? p.uri : undefined))
            .filter((u): u is string => !!u)

        const hasContent = !!selectedReason || !!notes.trim() || failurePhotos.length > 0
        if (!hasContent) return

        let cancelled = false
        const run = async () => {
            const existing = await loadParadaDraft(serviceId)
            if (cancelled) return

            const merged: ParadaDraft = {
                ...(existing ?? {}),
                failureReason: selectedReason ?? undefined,
                failureNotes: notes.trim() || undefined,
                failurePhotos: failurePhotos.length > 0 ? failurePhotos : undefined,
                localUpdatedAt: Date.now(),
            }
            await saveParadaDraft(serviceId, merged)

            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            saveTimerRef.current = setTimeout(() => {
                const { localUpdatedAt: _ignored, ...rest } = merged
                saveBackendDraft({
                    id: serviceId,
                    draft: { ...rest, clientDraftUpdatedAt: new Date().toISOString() },
                })
            }, SAVE_DEBOUNCE_MS)
        }
        void run()

        return () => {
            cancelled = true
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current)
                saveTimerRef.current = null
            }
        }
    }, [serviceId, selectedReason, notes, photos, saveBackendDraft])

    const addPhotos = useCallback((newAssets: ImagePicker.ImagePickerAsset[]) => {
        setPhotosState(prev => [...prev, ...newAssets])
    }, [])

    const removePhoto = useCallback((index: number) => {
        setPhotosState(prev => prev.filter((_, i) => i !== index))
    }, [])

    const retryPhotoUpload = useCallback((index: number) => {
        setPhotosState(prev =>
            prev.map((p, i) =>
                i === index && p.__uploadStatus === 'failed'
                    ? ({ ...p, __uploadStatus: undefined } as InsucessoPhoto)
                    : p,
            ),
        )
    }, [])

    const setSelectedReason = useCallback((reason: string | null) => {
        setSelectedReasonState(reason)
    }, [])

    const setNotes = useCallback((value: string) => {
        setNotesState(value)
    }, [])

    const clearDraft = useCallback(async () => {
        if (!serviceId) return
        await clearParadaDraft(serviceId)
        setSelectedReasonState(null)
        setNotesState('')
        setPhotosState([])
    }, [serviceId])

    const getUploadedPhotoUrls = useCallback((): string[] => {
        return photos
            .map(p => p.__s3Url ?? (p.uri.startsWith('http') ? p.uri : undefined))
            .filter((u): u is string => !!u)
    }, [photos])

    return {
        selectedReason,
        setSelectedReason,
        notes,
        setNotes,
        photos,
        addPhotos,
        removePhoto,
        retryPhotoUpload,
        clearDraft,
        getUploadedPhotoUrls,
    }
}
