import { useState } from 'react';

import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { Box, Button, Input, Text, TouchableOpacityBox } from '@/components';
import { DocumentCollectionForm, type DocumentData } from '@/components/DocumentCollectionForm';
import Modal from '@/components/Modal/Modal';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { useRoutingHandoff } from '@/domain/agility/routing/useCase/useRoutingHandoff';
import { uploadBase64Signature, uploadMultipleServicePhotos } from '@/domain/agility/service/serviceUploadUtils';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { useRota } from '../_context/RotaContext';

import type { TransferOrderOutcome } from './TransferOrderCard';
import { TransferOrderList } from './TransferOrderList';

/** Motivos de não-recebido (conferência por pedido, Fase 2). Sem migração: mapeia pra FailureReason.OTHER no back. */
const NOT_RECEIVED_REASONS = ['DANIFICADO', 'FALTOU', 'RECUSADO', 'OUTRO'] as const;

/**
 * Etapa 2 (comprovante) da tela de transferência: quem recebeu + documento,
 * foto/assinatura e o disparo do handoff (POST /routings/:id/handoff).
 *
 * Reorganiza a lógica que existia na v1 do TransferLegExecution (removida na
 * Task 3), agora enriquecida com DocumentCollectionForm (nome + tipo/número
 * de documento) no lugar do campo de nome solto.
 */
export function TransferComprovanteStep({ routingId, onBack, onDone }: { routingId: string; onBack: () => void; onDone: () => void }) {
    const { paradas } = useRota();
    const { showToast } = useToastService();
    const [doc, setDoc] = useState<DocumentData>({ recipientName: '', documentType: 'RG', documentNumber: '' });
    const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [signature, setSignature] = useState<string | null>(null);
    const [showSignature, setShowSignature] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Conferência por pedido (Fase 2): ausente no map = recebido (default).
    const [outcomes, setOutcomes] = useState<Record<string, TransferOrderOutcome>>({});
    const [reasonModalServiceId, setReasonModalServiceId] = useState<string | null>(null);
    const [reasonDraft, setReasonDraft] = useState<string>('');
    const [notesDraft, setNotesDraft] = useState<string>('');

    function openReasonModal(serviceId: string) {
        const existing = outcomes[serviceId];
        setReasonDraft(existing?.reason ?? '');
        setNotesDraft(existing?.notes ?? '');
        setReasonModalServiceId(serviceId);
    }

    function closeReasonModal() {
        setReasonModalServiceId(null);
    }

    function confirmReason() {
        if (!reasonModalServiceId || !reasonDraft) return;
        setOutcomes((prev) => ({
            ...prev,
            [reasonModalServiceId]: {
                outcome: 'NOT_RECEIVED',
                reason: reasonDraft,
                notes: notesDraft.trim() || undefined,
            },
        }));
        closeReasonModal();
    }

    function clearOutcome(serviceId: string) {
        setOutcomes((prev) => {
            const next = { ...prev };
            delete next[serviceId];
            return next;
        });
    }

    const { handoff } = useRoutingHandoff({
        onSuccess: (res) => {
            // Trecho com retorno: o backend materializa o Service RETURN e devolve
            // seu id. Em vez de encerrar aqui, o motorista segue pro fluxo de
            // retorno (voltar ao CD de origem + check-in), que fecha o trecho —
            // igual ao last-mile. Sem retorno: encerra como antes.
            const returnServiceId = res?.result?.returnServiceId;
            if (returnServiceId) {
                router.replace({
                    pathname: '/rotas-detalhadas/[id]/parada/[pid]/retorno' as never,
                    params: { id: routingId, pid: returnServiceId } as never,
                });
                return;
            }
            // Sem retorno: o host mostra a tela de sucesso full-screen e navega.
            onDone();
        },
        onError: () => {
            setSubmitting(false);
            showToast({ message: 'Não foi possível registrar a entrega. Tente novamente.', type: 'error' });
        },
    });

    // Igual ao SharedEtapaDados do last-mile: exige TODOS — nome + documento do
    // recebedor + foto + assinatura.
    const canSubmit =
        doc.recipientName.trim().length > 0 &&
        doc.documentNumber.trim().length > 0 &&
        photos.length > 0 &&
        !!signature;

    async function onConfirm() {
        if (!canSubmit || submitting) return;
        setSubmitting(true);

        const [photoUrls, signatureUrl] = await Promise.all([
            photos.length
                ? uploadMultipleServicePhotos(photos, routingId).catch(() => [] as string[])
                : Promise.resolve([] as string[]),
            signature
                ? uploadBase64Signature(signature, routingId).catch(() => null)
                : Promise.resolve<string | null>(null),
        ]);

        // Se o motorista anexou comprovante mas TUDO falhou no upload (ex.: rede
        // ruim no CD), NÃO seguir com um handoff sem prova — o comprovante é o
        // motivo desta tela. Aborta e pede pra tentar de novo.
        const anexouProva = photos.length > 0 || !!signature;
        if (anexouProva && photoUrls.length === 0 && !signatureUrl) {
            setSubmitting(false);
            showToast({ message: 'Falha ao enviar foto/assinatura. Verifique a conexão e tente novamente.', type: 'error' });
            return;
        }

        const docNote = doc.documentNumber.trim() ? `${doc.documentType}: ${doc.documentNumber.trim()}` : undefined;

        // Conferência por pedido: só monta `items` quando há ao menos uma
        // exceção (não-recebido); caso contrário omite, mantendo o backend no
        // comportamento atual (lote inteiro recebido).
        const hasException = Object.values(outcomes).some((o) => o.outcome === 'NOT_RECEIVED');
        const items = hasException
            ? paradas.map((p) =>
                outcomes[p.serviceId]?.outcome === 'NOT_RECEIVED'
                    ? {
                        serviceId: p.serviceId,
                        outcome: 'NOT_RECEIVED' as const,
                        reason: outcomes[p.serviceId].reason,
                        notes: outcomes[p.serviceId].notes,
                    }
                    : { serviceId: p.serviceId, outcome: 'RECEIVED' as const },
            )
            : undefined;

        handoff({
            id: routingId,
            payload: {
                proof: {
                    receivedBy: doc.recipientName.trim(),
                    photoProof: photoUrls.length ? photoUrls : undefined,
                    signature: signatureUrl ?? undefined,
                    notes: docNote,
                },
                items,
            },
        });
    }

    return (
        <Box gap="y16">
            <Box backgroundColor="secondary10" p="y12" borderRadius="s12">
                <Text preset="text13" color="gray700">
                    Confirme o recebimento do lote ({paradas.length} pedido{paradas.length === 1 ? '' : 's'}) no CD de destino.
                </Text>
            </Box>

            <TransferOrderList
                paradas={paradas}
                outcomes={outcomes}
                onMarkNotReceived={openReasonModal}
                onMarkReceived={clearOutcome}
            />

            <DocumentCollectionForm data={doc} onChange={setDoc} />

            <MultiPhotoPicker
                photos={photos}
                onPhotosChange={setPhotos}
                label="Foto da carga"
                maxPhotos={5}
                allowCamera
                photoSize={88}
            />

            <Box>
                <Text preset="text12" color="gray600" mb="b4">
                    Assinatura
                </Text>
                <Button
                    preset="outline"
                    title={signature ? 'Assinatura registrada ✓' : 'Registrar assinatura'}
                    onPress={() => setShowSignature(true)}
                />
            </Box>

            <Box gap="y12" pb="y24">
                <Button title="Registrar entrega da carga" onPress={onConfirm} disabled={!canSubmit || submitting} isLoading={submitting} />
                {!canSubmit ? (
                    <Text preset="text12" color="gray500" textAlign="center">
                        * Informe nome e documento do recebedor, foto e assinatura.
                    </Text>
                ) : null}
                <Button title="Voltar" onPress={onBack} preset="outline" />
            </Box>

            <Modal title="Assinatura" isVisible={showSignature} onClose={() => setShowSignature(false)}>
                <Box paddingHorizontal="x10" paddingTop="t10" paddingBottom="y10">
                    <Text preset="text16" fontWeightPreset="bold" color="colorTextPrimary" marginBottom="b10" textAlign="center">
                        Assinatura do recebedor
                    </Text>
                    <SignatureCanvas
                        onClear={() => setSignature(null)}
                        onSave={async (signatureUri: string) => {
                            setSignature(signatureUri);
                            setShowSignature(false);
                        }}
                        height={measure.y280}
                        penColor="black"
                        backgroundColor="white"
                        preset="textParagraph"
                    />
                </Box>
            </Modal>

            <Modal title="Pedido não recebido" isVisible={!!reasonModalServiceId} onClose={closeReasonModal}>
                <Box paddingHorizontal="x10" paddingTop="t10" paddingBottom="y10" gap="y16">
                    <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                        Motivo
                    </Text>
                    <Box gap="y8">
                        {NOT_RECEIVED_REASONS.map((reason) => (
                            <TouchableOpacityBox
                                key={reason}
                                onPress={() => setReasonDraft(reason)}
                                flexDirection="row"
                                alignItems="center"
                                gap="x12"
                                p="y12"
                                borderWidth={measure.m2}
                                borderColor={reasonDraft === reason ? 'primary100' : 'gray200'}
                                borderRadius="s12"
                                backgroundColor={reasonDraft === reason ? 'primary10' : 'white'}
                            >
                                <Text preset="text14" color="colorTextPrimary">{reason}</Text>
                            </TouchableOpacityBox>
                        ))}
                    </Box>
                    <Input
                        title="Observação (opcional)"
                        value={notesDraft}
                        onChangeText={setNotesDraft}
                        placeholder="Detalhe o que aconteceu"
                        multiline
                        numberOfLines={3}
                        height={measure.y80}
                        width="auto"
                    />
                    <Box gap="y10">
                        <Button title="Confirmar" onPress={confirmReason} disabled={!reasonDraft} />
                        <Button title="Cancelar" onPress={closeReasonModal} preset="outline" />
                    </Box>
                </Box>
            </Modal>
        </Box>
    );
}
