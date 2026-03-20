import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import type { ServiceCompletionDetailsRequest } from '@/domain/agility/service/dto/request/service-completion-details.request';
import { ServiceStatus } from '@/domain/agility/service/dto/types';
import { serviceService } from '@/domain/agility/service/serviceService';
import { useCompleteServiceWithDetails } from '@/domain/agility/service/useCase';
import { KEY_SERVICES, KEY_ROUTINGS } from '@/domain/queryKeys';
import { useToastService } from '@/services/Toast/useToast';

import { useParada } from '../_context/ParadaContext';

import { useServiceUpload } from './useServiceUpload';

// Delay para aguardar propagação do status no backend (race condition)
// Otimizado: reduzido de 500ms/5 tentativas (2.5s max) para 200ms/3 tentativas (600ms max)
const STATUS_PROPAGATION_DELAY_MS = 200;
const MAX_STATUS_CHECK_RETRIES = 3;

/**
 * Hook para gerenciar a finalização do serviço
 *
 * NOTA: Para iniciar serviço, use useStopActions.handleStartService ou handleGoToLocation
 * Este hook é focado exclusivamente em completar o serviço com detalhes
 *
 * FLUXO CORRIGIDO:
 * 1. Iniciar serviço (status IN_PROGRESS) - feito via useStartService
 * 2. Enviar detalhes de conclusão + completar serviço - feito via completeServiceWithDetails()
 *    (O backend já chama service.complete() internamente no completeWithDetails)
 */
export function useServiceCompletion() {
    const queryClient = useQueryClient();
    const {
        service,
        serviceId,
        rotaId,
        recipient,
        observation,
        checklist,
        finalizing,
        setFinalizing,
        setShowSuccess,
        resetState,
        photos,
    } = useParada();
    const { showToast } = useToastService();

    const { uploadPhotos, uploadSignature, signature } = useServiceUpload();

    // Ref para rastrear se o componente está montado (evitar memory leaks)
    const isMountedRef = useRef(true);

    // Ref para rastrear o timeout de reset
    const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup ao desmontar
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Limpar timeout pendente ao desmontar
            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
                resetTimeoutRef.current = null;
            }
        };
    }, []);

    // Hook para enviar detalhes de conclusão
    const { completeServiceWithDetailsAsync, isLoading: isCompletingWithDetails } = useCompleteServiceWithDetails();

    const invalidateQueries = useCallback(async () => {
        // Otimizado: usar invalidateQueries com refetchType: 'all' ao invés de
        // múltiplos invalidate + refetch separados (reduz de 5 para 2 operações)
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey: [KEY_SERVICES],
                refetchType: 'all'
            }),
            queryClient.invalidateQueries({
                queryKey: [KEY_ROUTINGS, rotaId],
                refetchType: 'all'
            }),
        ]);
    }, [queryClient, rotaId]);

    /**
     * Aguarda o status do serviço ser propagado no backend
     * Necessário para evitar race condition entre start() e completion-details
     */
    const waitForStatusPropagation = useCallback(async (
        targetServiceId: string,
        expectedStatus: ServiceStatus
    ): Promise<boolean> => {
        for (let attempt = 0; attempt < MAX_STATUS_CHECK_RETRIES; attempt++) {
            // Aguardar delay antes de verificar
            await new Promise(resolve => setTimeout(resolve, STATUS_PROPAGATION_DELAY_MS));

            // Verificar se ainda está montado
            if (!isMountedRef.current) {
                return false;
            }

            try {
                const response = await serviceService.findOne(targetServiceId);
                const currentStatus = response.result?.status;

                if (currentStatus === expectedStatus) {
                    return true;
                }
            } catch (error) {
                console.warn(`[useServiceCompletion] Erro ao verificar status (tentativa ${attempt + 1}):`, error);
            }
        }

        return false;
    }, []);

    // Finalizar serviço
    const handleFinalizar = useCallback(async () => {
        // Evitar duplo clique
        if (finalizing) {
            return;
        }

        try {
            // Validação inicial
            if (!serviceId) {
                showToast({ message: 'ID do serviço não encontrado.', type: 'error' });
                return;
            }

            // Validação robusta: verificar checklist E dados reais
            const hasRealPhotos = photos && photos.length > 0;
            const hasRealAssinatura = !!signature;
            const hasDocumento = checklist?.documento && recipient?.nome?.trim() && recipient?.numeroDocumento?.trim();

            if (!hasDocumento) {
                showToast({ message: 'Preencha os dados do documento antes de finalizar.', type: 'error' });
                return;
            }

            if (!hasRealPhotos) {
                showToast({ message: 'Tire pelo menos uma foto antes de finalizar.', type: 'error' });
                return;
            }

            if (!hasRealAssinatura) {
                showToast({ message: 'Colete a assinatura antes de finalizar.', type: 'error' });
                return;
            }

            setFinalizing(true);

            // Upload de photos com tratamento de erro robusto
            let photoUrls: string[] = [];
            try {
                photoUrls = await uploadPhotos();
            } catch (photoError) {
                console.error('[useServiceCompletion] Erro no upload de photos (continuando sem fotos):', photoError);
                photoUrls = [];
            }

            // Verificar se ainda está montado após operações assíncronas
            if (!isMountedRef.current) {
                return;
            }

            // Upload de signature com tratamento de erro robusto
            let signatureUrl: string | null = null;
            try {
                signatureUrl = signature ? await uploadSignature(signature) : null;
            } catch (sigError) {
                console.error('[useServiceCompletion] Erro no upload de signature (continuando sem assinatura):', sigError);
                signatureUrl = null;
            }

            // Verificar se ainda está montado
            if (!isMountedRef.current) {
                return;
            }

            // Preparar payload com tipo correto
            const payload: ServiceCompletionDetailsRequest = {};

            if (observation?.trim()) {
                payload.notes = observation.trim();
            }

            if (signatureUrl) {
                payload.customerSignature = signatureUrl;
            }

            if (recipient?.nome?.trim()) {
                payload.receivedBy = recipient.nome.trim();
            }

            if (photoUrls.length > 0) {
                payload.photoProof = photoUrls.length === 1 ? photoUrls[0] : photoUrls.join(',');
            }

            // Verificar se o serviço precisa ser iniciado
            const needsToStart = !service ||
                (service.status !== ServiceStatus.IN_PROGRESS &&
                    service.status !== ServiceStatus.COMPLETED);

            if (needsToStart) {
                // Iniciar o serviço automaticamente antes de finalizar
                try {
                    await serviceService.start(serviceId);
                } catch (startError) {
                    console.warn('[useServiceCompletion] Erro ao iniciar serviço (pode já estar iniciado):', startError);
                    // Continuar mesmo com erro - o serviço pode já estar iniciado
                }

                // Aguardar propagação do status
                const statusPropagated = await waitForStatusPropagation(serviceId, ServiceStatus.IN_PROGRESS);

                if (!statusPropagated) {
                    console.warn('[useServiceCompletion] Status não propagou, mas continuando mesmo assim...');
                }

                // Verificar se ainda está montado
                if (!isMountedRef.current) {
                    return;
                }

                // Invalidar cache para atualizar o estado
                await queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, serviceId] });
                await queryClient.invalidateQueries({ queryKey: [KEY_SERVICES, 'routing', rotaId] });
            }

            // CORREÇÃO: Não chamar complete() separadamente!
            // O completeWithDetails já chama service.complete() internamente no backend
            // Se chamarmos complete() antes, o backend vai rejeitar com "Service is already completed"

            // Usar versão async para poder aguardar e capturar erros corretamente
            try {
                await completeServiceWithDetailsAsync({
                    id: serviceId,
                    details: payload,
                });
            } catch (apiError) {
                console.error('[useServiceCompletion] Erro na API completeWithDetails:', apiError);
                throw apiError; // Re-throw para ser capturado pelo catch externo
            }

            // Verificar se ainda está montado após completar
            if (!isMountedRef.current) {
                return;
            }

            // Sucesso - invalidar queries e mostrar feedback
            await invalidateQueries();

            if (isMountedRef.current) {
                setFinalizing(false);
                setShowSuccess(true);

                // Reset state para evitar estado sujo ao voltar
                // Usar ref para poder cancelar se componente desmontar
                resetTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current) {
                        resetState();
                    }
                    resetTimeoutRef.current = null;
                }, 100);
            }
        } catch (e) {
            console.error('[useServiceCompletion] Erro ao finalizar:', e);

            if (isMountedRef.current) {
                const errorMessage = (e as { message?: string })?.message || 'Ocorreu um erro ao finalizar.';
                showToast({ message: errorMessage, type: 'error' });
                setFinalizing(false);
            }
        }
    }, [
        serviceId,
        checklist,
        finalizing,
        setFinalizing,
        uploadPhotos,
        signature,
        uploadSignature,
        observation,
        recipient,
        service,
        completeServiceWithDetailsAsync,
        queryClient,
        rotaId,
        waitForStatusPropagation,
        invalidateQueries,
        setShowSuccess,
        resetState,
        photos,
    ]);

    // Verificar se pode finalizar - validação robusta
    const canFinalize = useMemo(() => {
        const hasRealPhotos = photos && photos.length > 0;
        const hasRealAssinatura = !!signature;
        const hasDocumento = checklist?.documento && recipient?.nome?.trim() && recipient?.numeroDocumento?.trim();
        return hasDocumento && hasRealPhotos && hasRealAssinatura;
    }, [checklist?.documento, recipient?.nome, recipient?.numeroDocumento, photos?.length, signature]);

    return {
        // Ações
        handleFinalizar,

        // Estados
        isCompleting: isCompletingWithDetails || finalizing,
        canFinalize,

        // Checklist
        checklist,

        // Utilitários
        invalidateQueries,
    };
}