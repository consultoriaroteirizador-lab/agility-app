import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { requirementsForServiceType, ServiceFlowType } from '@/domain/agility/company/completionRequirements';
import type { ServiceCompletionDetailsRequest } from '@/domain/agility/service/dto/request/service-completion-details.request';
import { useCompleteServiceWithDetails } from '@/domain/agility/service/useCase';
import { routeStopChangedKeys } from '@/domain/queryKeys';
import { useToastService } from '@/services/Toast/useToast';
import { parseBRLToCents } from '@/utils/parseCurrency';

import { useParada } from '../_context/ParadaContext';
import { validateCompletion } from '../_utils/completionValidation';

import { getCurrentCoords } from './getCurrentCoords';
import { useServiceUpload } from './useServiceUpload';

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
export function useServiceCompletion(serviceType: ServiceFlowType = 'entrega') {
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
        paymentAmount,
        paymentMethod,
        pickupEvidence,
        deliveryCode,
        bypassReasonCode,
        bypassReasonText,
        completionRequirements,
    } = useParada();
    const { showToast } = useToastService();

    const { uploadPhotos, uploadSignature, signature } = useServiceUpload();

    const requirements = requirementsForServiceType(completionRequirements, serviceType);

    const completion = useMemo(
        () =>
            validateCompletion(requirements, {
                recipientTipo: recipient?.tipo,
                nome: recipient?.nome,
                documento: recipient?.numeroDocumento,
                hasSignature: !!signature,
                photoCount: photos?.length ?? 0,
            }),
        [requirements, recipient?.tipo, recipient?.nome, recipient?.numeroDocumento, signature, photos?.length],
    );

    // Ref para rastrear se o componente está montado (evitar memory leaks)
    const isMountedRef = useRef(true);

    // Guard síncrono contra duplo-tap. O `finalizing` em state é assíncrono — entre
    // o primeiro clique e o React re-renderizar, um segundo clique passaria pelo check.
    // O ref bloqueia imediatamente.
    const finalizingRef = useRef(false);

    // Ref para rastrear o timeout de reset
    const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup ao desmontar
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            finalizingRef.current = false;
            // Limpar timeout pendente ao desmontar
            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
                resetTimeoutRef.current = null;
            }
        };
    }, []);

    // Hook para enviar detalhes de conclusão
    const { completeServiceWithDetailsAsync, isLoading: isCompletingWithDetails } = useCompleteServiceWithDetails();

    // Reset defensivo: se o consumer (ex: SharedEtapaFinalizacao) monta com
    // `finalizing=true` no contexto MAS não há mutation em voo, é resíduo de
    // um fluxo anterior interrompido (navegou fora, erro engolido, race).
    // Sem isso, o botão "Finalizar" abre travado em "Finalizando...".
    useEffect(() => {
        if (finalizing && !isCompletingWithDetails) {
            setFinalizing(false);
        }
        // só na montagem — não queremos resetar durante um finalize em curso
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const invalidateQueries = useCallback(() => {
        // Invalidação cirúrgica em background — NÃO aguardamos o refetch (UI desbloqueia
        // na hora). Antes usava [KEY_SERVICES] + refetchType:'all', que refazia TODAS as
        // queries de serviço do app a cada conclusão. Agora mira só o que mudou: este
        // serviço, a lista da rota, a própria rota e o /map-data (que também carrega o
        // status das paradas — ver `routeStopChangedKeys`).
        for (const queryKey of routeStopChangedKeys(rotaId, serviceId)) {
            void queryClient.invalidateQueries({ queryKey });
        }
    }, [queryClient, serviceId, rotaId]);

    // Finalizar serviço
    const handleFinalizar = useCallback(async () => {
        // Guard síncrono contra duplo-tap (ref atualiza imediatamente, antes do re-render).
        if (finalizingRef.current || finalizing) {
            return;
        }
        finalizingRef.current = true;

        try {
            // Validação inicial
            if (!serviceId) {
                showToast({ message: 'ID do serviço não encontrado.', type: 'error' });
                finalizingRef.current = false;
                return;
            }

            if (!completion.canProceed) {
                showToast({
                    message: `Preencha antes de finalizar: ${completion.missing.join(', ')}`,
                    type: 'error',
                });
                finalizingRef.current = false;
                return;
            }

            // Bloquear finalização enquanto houver uploads de foto em andamento.
            // Evita race entre o upload incremental em background e o uploadPhotos() batch
            // disparado abaixo, que poderia duplicar requisições ou completar o serviço
            // antes das URLs S3 estarem disponíveis no payload.
            const photosUploading = (photos as { __uploadStatus?: string }[]).some(
                p => p.__uploadStatus === 'uploading'
            );
            if (photosUploading) {
                showToast({ message: 'Aguarde o upload das fotos terminar antes de finalizar.', type: 'error' });
                finalizingRef.current = false;
                return;
            }

            setFinalizing(true);

            // Upload de fotos e assinatura em PARALELO (são independentes). Ambos são
            // idempotentes: como o upload já acontece em background ao capturar a mídia,
            // aqui normalmente retornam de imediato as URLs já enviadas.
            const [photoUrls, signatureUrl] = await Promise.all([
                uploadPhotos().catch((photoError) => {
                    console.error('[useServiceCompletion] Erro no upload de photos (continuando sem fotos):', photoError);
                    return [] as string[];
                }),
                signature
                    ? uploadSignature(signature).catch((sigError) => {
                        console.error('[useServiceCompletion] Erro no upload de signature (continuando sem assinatura):', sigError);
                        return null;
                    })
                    : Promise.resolve<string | null>(null),
            ]);

            // Verificar se ainda está montado após operações assíncronas
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

            // Adicionar valor de pagamento se o serviço requer cobrança.
            // Input visual é uma máscara em centavos (digitar 12345 → "R$ 123,45"),
            // então parseBRLToCents extrai os dígitos diretamente sem ambiguidade.
            if (service?.requiresPayment && paymentAmount) {
                const cents = parseBRLToCents(paymentAmount);
                if (cents !== null && cents > 0) {
                    payload.receivedValue = cents;
                }
            }

            // Adicionar método de pagamento se selecionado
            if (service?.requiresPayment && paymentMethod) {
                payload.paymentMethod = paymentMethod;
            }

            // Captura a referência de GPS de onde o serviço foi finalizado (best-effort).
            const finishCoords = await getCurrentCoords();
            if (finishCoords) {
                payload.latitude = finishCoords.latitude;
                payload.longitude = finishCoords.longitude;
                payload.accuracy = finishCoords.accuracy;
            }

            // Código de confirmação de entrega (T3): envia o código informado OU,
            // quando o código foi dispensado (bypass), o motivo escolhido.
            if (deliveryCode?.trim()) {
                payload.deliveryCode = deliveryCode.trim();
            } else if (bypassReasonCode?.trim()) {
                payload.reasonCode = bypassReasonCode.trim();
                if (bypassReasonText?.trim()) {
                    payload.reasonText = bypassReasonText.trim();
                }
            }

            // TRANSFER: anexa a evidência da COLETA na origem (perna 1), capturada antes.
            if (pickupEvidence) {
                payload.pickupCompletion = {
                    customerSignature: pickupEvidence.signatureUrl,
                    receivedBy: pickupEvidence.receivedBy,
                    photoProof: pickupEvidence.photoUrls.length > 0
                        ? pickupEvidence.photoUrls.join(',')
                        : undefined,
                    notes: pickupEvidence.notes,
                };
            }

            console.log('[useServiceCompletion] Payload a ser enviado:', JSON.stringify(payload, null, 2));

            // O backend conclui de forma atômica a partir de qualquer estado pré-terminal
            // (PENDING/ASSIGNED/IN_PROGRESS/IN_ATTENDANCE): a passagem pelo "atendimento" é
            // implícita e ele seta startDate se faltar. Por isso NÃO precisamos mais
            // pré-iniciar o atendimento nem ficar fazendo polling de propagação de status
            // antes de finalizar — economiza 1 request + até 600ms de espera fixa.

            // O completeWithDetails já chama service.complete() internamente no backend.
            // Usar versão async para poder aguardar e capturar erros corretamente.
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

            // Sucesso - invalida em background (não bloqueia o feedback de sucesso)
            invalidateQueries();

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
        } finally {
            finalizingRef.current = false;
        }
    }, [
        serviceId,
        completion,
        finalizing,
        setFinalizing,
        uploadPhotos,
        signature,
        uploadSignature,
        observation,
        recipient,
        service,
        completeServiceWithDetailsAsync,
        invalidateQueries,
        setShowSuccess,
        resetState,
        photos,
        paymentAmount,
        paymentMethod,
        pickupEvidence,
        deliveryCode,
        bypassReasonCode,
        bypassReasonText,
    ]);

    // Verificar se pode finalizar - mesma regra de `completion`, dono unico da pergunta
    const canFinalize = completion.canProceed;

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