import { useState } from 'react';

import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { Box, Button, LocalIcon, Text } from '@/components';
import { DocumentCollectionForm, type DocumentData } from '@/components/DocumentCollectionForm';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { useRoutingHandoff } from '@/domain/agility/routing/useCase/useRoutingHandoff';
import { uploadBase64Signature, uploadMultipleServicePhotos } from '@/domain/agility/service/serviceUploadUtils';
import { measure } from '@/theme';

import { useRota } from '../_context/RotaContext';

/**
 * Etapa 2 (comprovante) da tela de transferência: quem recebeu + documento,
 * foto/assinatura e o disparo do handoff (POST /routings/:id/handoff).
 *
 * Reorganiza a lógica que existia na v1 do TransferLegExecution (removida na
 * Task 3), agora enriquecida com DocumentCollectionForm (nome + tipo/número
 * de documento) no lugar do campo de nome solto.
 */
export function TransferComprovanteStep({ routingId, onBack }: { routingId: string; onBack: () => void }) {
    const { paradas } = useRota();
    const [doc, setDoc] = useState<DocumentData>({ recipientName: '', documentType: 'RG', documentNumber: '' });
    const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [signature, setSignature] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const { handoff } = useRoutingHandoff({
        onSuccess: () => {
            setDone(true);
            setTimeout(() => router.replace('/(auth)/(tabs)'), 2000);
        },
        onError: () => setSubmitting(false),
    });

    const canSubmit = doc.recipientName.trim().length > 0 && (photos.length > 0 || !!signature);

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

        const docNote = doc.documentNumber.trim() ? `${doc.documentType}: ${doc.documentNumber.trim()}` : undefined;

        handoff({
            id: routingId,
            payload: {
                proof: {
                    receivedBy: doc.recipientName.trim(),
                    photoProof: photoUrls.length ? photoUrls : undefined,
                    signature: signatureUrl ?? undefined,
                    notes: docNote,
                },
            },
        });
    }

    if (done) {
        return (
            <Box flex={1} backgroundColor="primary100" justifyContent="center" alignItems="center" px="x24">
                <LocalIcon iconName="check" size={measure.m40} color="white" />
                <Text preset="text18" color="white" textAlign="center" mt="y16">
                    Transferência concluída{'\n'}com sucesso
                </Text>
            </Box>
        );
    }

    return (
        <Box gap="y16">
            <Box backgroundColor="secondary10" p="y12" borderRadius="s12">
                <Text preset="text13" color="gray700">
                    Confirme o recebimento do lote ({paradas.length} pedido{paradas.length === 1 ? '' : 's'}) no CD de destino.
                </Text>
            </Box>

            <DocumentCollectionForm data={doc} onChange={setDoc} />

            <MultiPhotoPicker
                photos={photos}
                onPhotosChange={setPhotos}
                label="Foto da carga (opcional se houver assinatura)"
                maxPhotos={5}
                allowCamera
            />

            <Box>
                <Text preset="text12" color="gray600" mb="b4">
                    Assinatura (opcional se houver foto)
                </Text>
                <SignatureCanvas onSave={setSignature} onClear={() => setSignature(null)} height={measure.y200} penColor="black" backgroundColor="white" />
                {signature ? (
                    <Text preset="text12" color="primary100" mt="t4">
                        Assinatura registrada.
                    </Text>
                ) : null}
            </Box>

            <Box gap="y12" pb="y24">
                <Button title="Registrar entrega da carga" onPress={onConfirm} disabled={!canSubmit || submitting} isLoading={submitting} />
                {!canSubmit ? (
                    <Text preset="text12" color="gray500" textAlign="center">
                        * Informe quem recebeu e anexe uma foto ou assinatura.
                    </Text>
                ) : null}
                <Button title="Voltar" onPress={onBack} preset="outline" />
            </Box>
        </Box>
    );
}
